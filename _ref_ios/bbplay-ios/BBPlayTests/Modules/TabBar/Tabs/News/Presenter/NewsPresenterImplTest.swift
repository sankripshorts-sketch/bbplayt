import XCTest
@testable import BBPlay

final class NewsPresenterImplTest: XCTestCase {
    
    var mockNewsView: MockNewsView!
    var mockNewsNetworkAPIImpl: MockNewsNetworkAPIImpl!
    var mockNewsNetworkModelConverter: MockNewsNetworkModelConverterImpl!
    var mockNewsViewModelConverter: MockNewsViewModelConverterImpl!
    var sut: NewsPresenterImpl!
    
    override func setUp() {
        super.setUp()

        mockNewsView = MockNewsView()
        mockNewsNetworkAPIImpl = MockNewsNetworkAPIImpl()
        mockNewsNetworkModelConverter = MockNewsNetworkModelConverterImpl()
        mockNewsViewModelConverter = MockNewsViewModelConverterImpl()
        
        sut = NewsPresenterImpl(
            newsNetworkAPI: mockNewsNetworkAPIImpl,
            newsNetworkModelConverter: mockNewsNetworkModelConverter,
            newsViewModelConverter: mockNewsViewModelConverter
        )

    }

    override func tearDown() {
        mockNewsView = nil
        mockNewsNetworkAPIImpl = nil
        mockNewsNetworkModelConverter = nil
        mockNewsViewModelConverter = nil
        sut = nil
        super.tearDown()
    }

    func testSetView(view: NewsView) {
        sut.view = mockNewsView
        XCTAssertTrue(true)
    }
    
    func testOnViewDidLoad() {
        let expectation = expectation(description: "async")

        sut.view = mockNewsView
        sut.onViewDidLoad()

        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [self] in
            XCTAssertEqual(mockNewsView.showSkeletonCalledCount, 1)
            XCTAssertEqual(mockNewsNetworkAPIImpl.getNewsFeedCallCount, 1)
            XCTAssertEqual(mockNewsNetworkModelConverter.converterNewsResponseCallCount, 1)
            XCTAssertEqual(mockNewsViewModelConverter.converterNewsFeedCallCount, 1)
            XCTAssertEqual(mockNewsView.hideSkeletonCalledCount, 1)
            XCTAssertEqual(mockNewsView.updateCalledCount, 1)
            XCTAssertEqual(mockNewsView.endRefreshingCalledCount, 1)
            
            expectation.fulfill()
        }

        waitForExpectations(timeout: 1.0)
    }

    func testOnViewDidLoadWithFailure() {
        let expectation = expectation(description: "async")

        sut.view = mockNewsView
        mockNewsNetworkAPIImpl.shouldSuccess = false
        sut.onViewDidLoad()

        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [self] in
            XCTAssertEqual(mockNewsView.showSkeletonCalledCount, 1)
            XCTAssertEqual(mockNewsView.hideSkeletonCalledCount, 0)
            XCTAssertEqual(mockNewsView.updateCalledCount, 0)

            expectation.fulfill()
        }
        waitForExpectations(timeout: 1.0)
    }

    func testHandlePullToRefreshOnTrue() {
        let expectation = expectation(description: "async")

        sut.view = mockNewsView
        sut.handlePullToRefresh(with: true)
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [self] in
            XCTAssertEqual(mockNewsView.showSkeletonCalledCount, 1)
            XCTAssertEqual(mockNewsNetworkAPIImpl.getNewsFeedCallCount, 1)
            XCTAssertEqual(mockNewsNetworkModelConverter.converterNewsResponseCallCount, 1)
            XCTAssertEqual(mockNewsViewModelConverter.converterNewsFeedCallCount, 1)
            XCTAssertEqual(mockNewsView.hideSkeletonCalledCount, 1)
            XCTAssertEqual(mockNewsView.updateCalledCount, 1)
            XCTAssertEqual(mockNewsView.endRefreshingCalledCount, 1)
            expectation.fulfill()
        }
        waitForExpectations(timeout: 1.0)
    }

    func testHandlePullToRefreshOnFalse() {
        sut.view = mockNewsView
        sut.handlePullToRefresh(with: false)

        XCTAssertTrue(true)
    }

    func testPostTap() {
        sut.view = mockNewsView
        sut.postTap(with: 0)
        XCTAssertEqual(mockNewsView.openPostCalledCount, 1)
    }

}
