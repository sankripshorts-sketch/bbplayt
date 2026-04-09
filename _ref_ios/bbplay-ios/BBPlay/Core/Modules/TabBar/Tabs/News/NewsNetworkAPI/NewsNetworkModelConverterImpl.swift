import Foundation

protocol NewsNetworkModelConverter {
    func converterNewsResponse(with newsResponse: NewsResponse) -> News
}

enum NewsPostType {
    case video
    case link
    case photo
    case poll
}

final class NewsNetworkModelConverterImpl: NewsNetworkModelConverter {
    func converterNewsResponse(with newsResponse: NewsResponse) -> News {
        let items: [NewsItem] = newsResponse.response.items.compactMap { item in
            var newsPosts: [Post]?
            var forwardedMessages: [ForwardedMessage]?
            
            if let posts = item.post {
                newsPosts = convertPost(posts: posts)
            }
            if let forwardedMessage = item.forwardedMessage {
                forwardedMessages = convertForwardedMessage(forwardedMessage: forwardedMessage)
            }
            
            return NewsItem(post: newsPosts,
                            date: item.date,
                            id: item.id,
                            commentsCount: item.comments.count,
                            textPosts: item.textPosts,
                            forwardedMessage: forwardedMessages)
        }
        return News(items: items)
    }

    private func convertPost(posts: [ItemAttachmentResponse]) -> [Post] {
        let newsPosts = posts.compactMap({ post in
            if let video = post.video {
                return convertVideo(video: video, postType: post.postType)
            } else if let link = post.link {
                return convertLink(link: link, postType: post.postType)
            } else if let photo = post.photo {
                return convertPhoto(photo: photo, postType: post.postType)
            } else {
                return Post(postType: post.postType)
            }
        })
        return newsPosts
    }
    
    private func convertForwardedMessage(forwardedMessage: [ForwardedMessageResponse]) -> [ForwardedMessage] {
        let forwardedMessages = forwardedMessage.compactMap { forwardedMessage in
            guard let post = forwardedMessage.post else {
                return ForwardedMessage(type: forwardedMessage.type,
                                        date: forwardedMessage.date,
                                        postType: forwardedMessage.postType,
                                        text: forwardedMessage.text)
            }
            return ForwardedMessage(type: forwardedMessage.type,
                                    posts: convertPost(posts: post),
                                    date: forwardedMessage.date,
                                    postType: forwardedMessage.postType,
                                    text: forwardedMessage.text)
        }
        return forwardedMessages
    }
    
    private func convertPhoto(photo: PhotoResponse, postType: String) -> Post {
        let sizes: [Size] = convertSize(sizes: photo.sizes) 
        return Post(postType: postType,
                    photo: Photo(date: photo.date,
                                 sizes: sizes,
                                 text: photo.text,
                                 hasTags: photo.hasTags,
                                 postID: photo.postID))
    }
    
    private func convertLink(link: LinkResponse, postType: String) -> Post {
        guard let photoLink = link.photo else {
            let link = Link(url: link.url,
                            description: link.description,
                            title: link.title)
            return Post(postType: postType,
                        link: link)
        }
        let sizes: [Size] = convertSize(sizes: photoLink.sizes)
        
        let photo = Photo(date: photoLink.date,
                          sizes: sizes,
                          text: photoLink.text,
                          hasTags: photoLink.hasTags,
                          postID: photoLink.postID)
        
        let link = Link(url: link.url,
                        description: link.description,
                        photo: photo,
                        title: link.title)
        
        return Post(postType: postType,
                    link: link)
    }
    
    private func convertVideo(video: VideoResponse, postType: String) -> Post {
        let sizes: [Size] = convertSize(sizes: video.imageSize)
        
        let video = Video(accessKey: video.accessKey ?? "",
                          date: video.date,
                          description: video.description,
                          imageSizes: sizes,
                          id: video.id,
                          ownerID: video.ownerID,
                          title: video.title,
                          trackCode: video.trackCode)

        return Post(postType: postType,
                    video: video)
    }
    
    private func convertSize(sizes: [SizeResponse]) -> [Size] {
        let sizes: [Size] = sizes.compactMap { size in
            return Size(height: size.height,
                        type: size.type,
                        width: size.width,
                        url: size.url,
                        withPadding: size.withPadding)
        }
        return sizes
    }
}
