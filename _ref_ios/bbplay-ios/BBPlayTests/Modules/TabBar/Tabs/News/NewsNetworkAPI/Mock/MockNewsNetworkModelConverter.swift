import XCTest
@testable import BBPlay

final class MockNewsNetworkModelConverterImpl: NewsNetworkModelConverter {

    var converterNewsResponseCallCount: Int = 0
    var convertPostCallCount: Int = 0
    var convertForwardedMessageCallCount: Int = 0
    var convertPhotoCallCount: Int = 0
    var convertLinkCallCount: Int = 0
    var convertVideoCallCount: Int = 0
    var convertSizeCallCount: Int = 0

    var news: News = .init(
        items: [
            .init(date: 0, id: 1, commentsCount: 1, textPosts: "nil", forwardedMessage: nil),
            .init(
                post: [
                    .init(postType: "testType")
                ], date: 0, id: 1, commentsCount: 2, textPosts: "testText", forwardedMessage: [
                    .init(
                        type: "testType", posts: [
                            .init(postType: "testType")
                        ], date: 0, postType: "testType", text: "testText"
                    )
                ]
            )
        ]
    )

    func converterNewsResponse(with newsResponse: NewsResponse) -> News {
        converterNewsResponseCallCount += 1

        for item in newsResponse.response.items {
            if let posts = item.post {
                convertPost(posts: posts)
            }
            if let forwardedMessage = item.forwardedMessage {
                convertForwardedMessage(forwardedMessage: forwardedMessage)
            }
        }

        return news
    }

    private func convertPost(posts: [ItemAttachmentResponse]) {
        convertPostCallCount += 1

        for post in posts {
            if let video = post.video {
                return convertVideo(video: video)
            } else if let link = post.link {
                return convertLink(link: link)
            } else if let photo = post.photo {
                return convertPhoto(photo: photo)
            }
        }
    }

    private func convertForwardedMessage(forwardedMessage: [ForwardedMessageResponse]) {
        convertForwardedMessageCallCount += 1

        for forwardedMessage in forwardedMessage {
            if let post = forwardedMessage.post {
                convertPost(posts: post)
            }
        }
    }
    
    private func convertPhoto(photo: PhotoResponse) {
        convertPhotoCallCount += 1
        convertSize(sizes: photo.sizes)
    }
    
    private func convertLink(link: LinkResponse) {
        convertLinkCallCount += 1

        guard let photoLink = link.photo else { return }
        convertSize(sizes: photoLink.sizes)

    }
    
    private func convertVideo(video: VideoResponse) {
        convertSize(sizes: video.imageSize)
        convertVideoCallCount += 1
    }
    
    private func convertSize(sizes: [SizeResponse]) {
        for _ in sizes {
            convertSizeCallCount += 1
        }
    }
}
