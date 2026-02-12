import requests
import sys
import json
import os
from datetime import datetime
import tempfile

class KnowledgeQAAPITester:
    def __init__(self, base_url="https://smart-qa-hub-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.document_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'} if not files else {}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, timeout=60)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=60)
            
            print(f"Response Status: {response.status_code}")
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"Error: {error_data}")
                except:
                    print(f"Error text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET", 
            "health",
            200
        )
        if success:
            # Verify expected fields
            expected_fields = ['status', 'database', 'documents_count', 'chunks_count']
            for field in expected_fields:
                if field not in response:
                    print(f"❌ Health response missing field: {field}")
                    return False
            print(f"📊 System Stats - Docs: {response.get('documents_count')}, Chunks: {response.get('chunks_count')}")
        return success

    def test_upload_document(self):
        """Test document upload with a sample text file"""
        # Create a sample text file
        sample_text = """
        This is a test document for the Private Knowledge Q&A system.
        
        The system uses RAG (Retrieval Augmented Generation) to answer questions.
        It chunks documents, creates embeddings, and stores them in MongoDB.
        
        Users can upload text files and then ask questions about the content.
        The AI will provide answers with source citations showing which documents
        and text chunks were used to generate the response.
        
        This is a comprehensive testing document with multiple paragraphs
        to ensure proper chunking and retrieval functionality.
        """
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(sample_text)
            temp_file_path = f.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                files = {'file': ('test_document.txt', f, 'text/plain')}
                success, response = self.run_test(
                    "Upload Document",
                    "POST",
                    "documents/upload",
                    200,
                    files=files
                )
                
            if success and 'id' in response:
                self.document_id = response['id']
                print(f"📄 Document uploaded with ID: {self.document_id}")
                print(f"📄 Chunks created: {response.get('chunk_count', 0)}")
                return True
            return False
            
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_file_path)
            except:
                pass

    def test_get_documents(self):
        """Test getting all documents"""
        success, response = self.run_test(
            "Get Documents",
            "GET",
            "documents", 
            200
        )
        if success:
            documents = response.get('documents', [])
            count = response.get('count', 0)
            print(f"📚 Found {count} documents")
            if documents and len(documents) > 0:
                print(f"📋 First document: {documents[0].get('name', 'N/A')}")
                return True
            elif count == 0:
                print("📋 No documents found (this might be expected for a fresh system)")
                return True
        return False

    def test_get_specific_document(self):
        """Test getting a specific document by ID"""
        if not self.document_id:
            print("⏭️ Skipping - no document ID available")
            return True
            
        success, response = self.run_test(
            "Get Specific Document",
            "GET",
            f"documents/{self.document_id}",
            200
        )
        if success:
            print(f"📄 Document name: {response.get('name', 'N/A')}")
            print(f"📄 Chunk count: {response.get('chunk_count', 0)}")
        return success

    def test_ask_question(self):
        """Test asking a question using RAG"""
        success, response = self.run_test(
            "Ask Question",
            "POST",
            "ask",
            200,
            data={"question": "What is RAG and how does it work?"}
        )
        if success:
            answer = response.get('answer', '')
            sources = response.get('sources', [])
            print(f"🤖 Answer length: {len(answer)} chars")
            print(f"🔗 Number of sources: {len(sources)}")
            if sources:
                for i, source in enumerate(sources):
                    print(f"   Source {i+1}: {source.get('document_name')} (score: {source.get('score', 0)})")
            return True
        return False

    def test_ask_empty_question(self):
        """Test error handling for empty question"""
        success, response = self.run_test(
            "Ask Empty Question",
            "POST",
            "ask",
            400,
            data={"question": ""}
        )
        return success

def main():
    print("🚀 Starting Private Knowledge Q&A API Tests")
    print("=" * 60)
    
    tester = KnowledgeQAAPITester()
    
    # Test sequence
    test_functions = [
        tester.test_health_check,
        tester.test_get_documents,
        tester.test_upload_document,
        tester.test_get_documents,  # Test again after upload
        tester.test_get_specific_document,
        tester.test_ask_question,
        tester.test_ask_empty_question,
    ]
    
    for test_func in test_functions:
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test function {test_func.__name__} failed with exception: {e}")
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Backend API tests mostly successful!")
        return 0
    elif success_rate >= 50:
        print("⚠️  Backend API has some issues but partially working")
        return 1
    else:
        print("❌ Backend API has major issues")
        return 2

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)