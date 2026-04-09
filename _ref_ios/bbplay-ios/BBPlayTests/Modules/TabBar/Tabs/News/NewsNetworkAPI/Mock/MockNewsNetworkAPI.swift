import XCTest
@testable import BBPlay

final class MockNewsNetworkAPIImpl: NewsNetworkAPI {
    
    var getNewsFeedCallCount = 0
    var shouldSuccess: Bool = true
    var decodedResponse: NewsResponse?

    func getNewsFeed() async throws -> NewsResponse {
        getNewsFeedCallCount += 1
        
        let mockJson = """
{
    "response": {
        "items": [
            {
                "date": 0,
                "id": 1,
                "text": "nil",
                "comments": {
                    "count": 1
                }
            },
            {
                "attachments": [
                    {
                        "type": "testType"
                    }
                ],
                "date": 0,
                "id": 1,
                "text": "testText",
                "comments": {
                    "count": 2
                },
                "copy_history": [
                    {
                        "type": "testType",
                        "attachments": [
                            {
                                "type": "testType"
                            }
                        ],
                        "date": 0,
                        "post_type": "testType",
                        "text": "testText"
                    }
                ]
            }
        ]
    }
}
"""
        if shouldSuccess {
            decodedResponse = try JSONDecoder()
                .decode(NewsResponse.self, from: mockJson.data(using: .utf8)!)
            return decodedResponse!
        } else {
            throw NSError("mock error")
        }
    }
}

