import Foundation
import UIKit

struct News {
    let items: [NewsItem]
}

struct NewsItem {
    var post: [Post]?
    let date: Int
    let id: Int
    let commentsCount: Int
    let textPosts: String
    let forwardedMessage: [ForwardedMessage]?
}

struct ForwardedMessage {
    let type: String
    var posts: [Post]?
    let date: Int
    let postType: String
    let text: String
}

struct Post {
    let postType: String
    var photo: Photo?
    var link: Link?
    var video: Video?
}

struct Link {
    let url: String
    let description: String?
    var photo: Photo?
    let title: String
}

struct Photo {
    let date: Int
    let sizes: [Size]
    let text: String
    let hasTags: Bool
    var postID: Int?
}

struct Video {
    let accessKey: String
    let date: Int
    let description: String
    let imageSizes: [Size]
    let id: Int
    let ownerID: Int
    let title: String
    let trackCode: String
}

struct Size {
    let height: Int
    let type: String?
    let width: Int
    let url: String
    var withPadding: Int?
    
    var resolution: Float {
        Float(height * width)
    }
    
    var size: CGSize {
        return CGSize(width: width,
                      height: height)
    }
}

