import Foundation
import UIKit

struct NewsFeed: Hashable {
    let posts: [NewsPost]
}

struct NewsPost: Hashable {
    let config: CellConfiguration
    let type: [NewsPostType]
    let date: String
    let postId: Int
    let commentsCount: Int
    let mainText: String
    let repostText: String
    let imageСontent: ImageContents?
    let links: [LinkInPost]?
    let videos: [VideoInPost]?
}

struct ImageContents: Hashable {
    let propertiImage: PropertiImage?
    let countImages: Int
}

struct PropertiImage: Hashable {
    let type: NewsPostType
    let image: UIImage?
    let height: CGFloat
    let width: CGFloat
}

struct LinkInPost: Hashable {
    let titleLink: String
    let descriptionLink: String?
    let link: URL
}

struct VideoInPost: Hashable{
    let titleVideo: String
    let descriptionVideo: String
    let linkVideo: URL
}
