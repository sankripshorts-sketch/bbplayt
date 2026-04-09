import XCTest
@testable import BBPlay

final class MockNewsView: NewsView {

    var updateCalledCount = 0
    var openPostCalledCount = 0
    var showSkeletonCalledCount = 0
    var hideSkeletonCalledCount = 0
    var endRefreshingCalledCount = 0

    func update(with news: [NewsPost]) {
        updateCalledCount += 1
    }

    func openPost(postId: Int, ownerId: String) {
        openPostCalledCount += 1
    }

    func showSkeleton() {
        showSkeletonCalledCount += 1
    }

    func hideSkeleton() {
        hideSkeletonCalledCount += 1
    }

    func endRefreshing() {
        endRefreshingCalledCount += 1
    }

}
