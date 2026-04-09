import Foundation
import UIKit

struct NewsResponse: Decodable {
    let response: Response
}

struct Response: Decodable {
    let items: [ItemResponse]
}

struct ItemResponse: Decodable {
    let post: [ItemAttachmentResponse]?
    let date: Int
    let textPosts: String
    let comments: CommentsResponse
    let id: Int
    let forwardedMessage: [ForwardedMessageResponse]?
    
    enum CodingKeys: String, CodingKey {
        case post = "attachments"
        case date, id, comments
        case textPosts = "text"
        case forwardedMessage = "copy_history"
    }
}

struct CommentsResponse: Decodable {
    let count: Int
}

struct ForwardedMessageResponse: Decodable {
    let type: String
    let post: [ItemAttachmentResponse]?
    let date: Int
    let postType: String
    let text: String
    
    enum CodingKeys: String, CodingKey {
        case type
        case post = "attachments"
        case date
        case postType = "post_type"
        case text
    }
}

struct ItemAttachmentResponse: Decodable {
    let postType: String
    let photo: PhotoResponse?
    let link: LinkResponse?
    let video: VideoResponse?
    enum CodingKeys: String, CodingKey {
        case postType = "type"
        case photo, link, video
    }
}

struct LinkResponse: Decodable {
    let url: String
    let description: String?
    let photo: PhotoResponse?
    let title: String
}

struct PhotoResponse: Decodable {
    let date: Int
    let sizes: [SizeResponse]
    let text: String
    let hasTags: Bool
    let postID: Int?
    
    enum CodingKeys: String, CodingKey {
        case date
        case sizes, text
        case hasTags = "has_tags"
        case postID = "post_id"
    }
}

struct VideoResponse: Decodable {
    let accessKey: String?
    let date: Int
    let description: String
    let imageSize: [SizeResponse]
    let id: Int
    let ownerID: Int
    let title, trackCode: String

    enum CodingKeys: String, CodingKey {
        case accessKey = "access_key"
        case date, description
        case imageSize = "image"
        case id
        case ownerID = "owner_id"
        case title
        case trackCode = "track_code"
        
    }
}

struct SizeResponse: Decodable {
    let height: Int
    let type: String?
    let width: Int
    let url: String
    let withPadding: Int?
    
    enum CodingKeys: String, CodingKey {
        case height, type, width, url
        case withPadding = "with_padding"
    }
}
