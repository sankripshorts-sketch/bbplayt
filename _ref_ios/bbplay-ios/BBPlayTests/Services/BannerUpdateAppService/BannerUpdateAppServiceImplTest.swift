import XCTest
@testable import BBPlay

final class BannerUpdateAppServiceImplTest: XCTestCase {

    var mockCurrentAppVersion: String?
    var mockRequestWrapper: MockRequestWrapper!
    var mockNetworkServiceImpl: MockNetworkServiceImpl!

    var sut: BannerUpdateAppServiceImpl!

    override func setUp() {
        super.setUp()
        
        mockCurrentAppVersion = "1.3.8"
        mockRequestWrapper = MockRequestWrapper()
        mockNetworkServiceImpl = MockNetworkServiceImpl(
            mockRequestWrapper: mockRequestWrapper
        )
        sut = BannerUpdateAppServiceImpl(
            proxyNetworkService: mockNetworkServiceImpl
        )
    }

    override func tearDown() {
        mockRequestWrapper = nil
        mockNetworkServiceImpl = nil
        sut = nil
        super.tearDown()
    }

    func testCheckForUpdates() async {
        mockRequestWrapper.reset()
        mockRequestWrapper.json = Self.json
        let result = await sut.checkForUpdates()
        XCTAssertTrue(mockRequestWrapper.isSuccessMappedSuccess && mockCurrentAppVersion == "1.3.8" && !result)
    }

    func testCheckForUpdatesWithNetworkError() async {
        mockRequestWrapper.reset()
        let result = await sut.checkForUpdates()
        XCTAssertTrue(mockRequestWrapper.isSuccessMappedError && !result)
    }
    
    func testCheckForUpdatesWithServerError() async {
        mockRequestWrapper.reset()
        mockRequestWrapper.errorJson = Self.errorJson
        let result = await sut.checkForUpdates()
        XCTAssertTrue(mockRequestWrapper.isErrorMappedSuccess && !result)
    }
}

extension BannerUpdateAppServiceImplTest {
    static var json: String {
"""
 {
  "code": 0,
  "message": "Success",
  "data": {
    "android_version": "1.3.5",
    "ios_version": "1.3.8"
  }
 }
 """
    }

    static var errorJson: String {
 """
 {
  "code": 0,
  "message": "Error"
 }
 """
    }
}
