import XCTest
@testable import BBPlay

final class MockNewsViewModelConverterImpl: NewsViewModelConverter {
    
    var converterNewsFeedCallCount = 0
    
    func converterNewsFeed(news: News) async -> NewsFeed {
        converterNewsFeedCallCount += 1
        return NewsFeed(
            posts: [
            .init(
                config: .init(
                    haveImage: false,
                    haveLink: false,
                    havePoll: false
                ),
                type: [.poll],
                date: "0",
                postId: 0,
                commentsCount: 0,
                mainText: "",
                repostText: "",
                imageСontent: nil,
                links: [],
                videos: [])
            ]
        )
    }

}
