import Foundation
import UIKit

protocol NewsViewModelConverter {
    func converterNewsFeed(news: News) async -> NewsFeed
}

final class NewsViewModelConverterImpl: NewsViewModelConverter {
    func converterNewsFeed(news: News) async -> NewsFeed {
        let newsPosts = await withTaskGroup(
            of: NewsPost.self,
            returning: [NewsPost].self) { group in
                news.items.forEach { item in
                    group.addTask { [self] in
                        let postTypes = getNewsPostTypes(item: item)
                        let image = await getImageContents(item: item)
                        let repostText = getRepostText(item: item)
                        let links = getLinksInPost(item: item)
                        let videos = getVideosInPost(item: item)
                        
                        let config = CellConfiguration(
                            haveImage: image.propertiImage != nil,
                            haveLink: !links.isEmpty,
                            havePoll: postTypes.contains(where: { $0 == .poll })
                        )
                        
                        return .init(
                            config: config,
                            type: postTypes,
                            date: convertDate(with: item.date),
                            postId: item.id,
                            commentsCount: item.commentsCount,
                            mainText: item.textPosts,
                            repostText: repostText,
                            imageСontent: image,
                            links: links,
                            videos: videos
                        )
                    }
                }

                return await group
                    .reduce(
                        into: [], { result, element in
                            result.append(element)
                        }
                    )
                    .sorted { $0.date > $1.date }
                
            }

        return NewsFeed(posts: newsPosts)
    }

    private func convertDate(with dateInterval: Int) -> String {
        let date = Date(timeIntervalSince1970: TimeInterval(dateInterval))
        
        let formatter = DateFormatter()
        formatter.locale = .current
        let secondsFromGMT = formatter.timeZone.secondsFromGMT(for: Date())
        formatter.timeZone = .init(secondsFromGMT: secondsFromGMT)
        formatter.setLocalizedDateFormatFromTemplate("d MMM")
        let stringMonth = formatter.string(from: date)
        
        formatter.dateFormat = "HH:mm"
        let stringTime = formatter.string(from: date)
        
        return stringMonth + Localizable.newsInAfterDate() + stringTime
    }
    
    private func getRepostText(item: NewsItem) -> String {
        var repostText = ""
        guard let forwardedMessages = item.forwardedMessage else { return repostText }
        
        forwardedMessages.forEach { message in
            repostText += "\(message.text)\n"
        }
        return repostText
    }
    
    //MARK: - Get news post type -
    private func getNewsPostTypes(item: NewsItem) -> [NewsPostType] {
        var postTypesString: [String] = []
        if let posts = item.post  {
            postTypesString = returnNewsPostTypes(posts: posts)
        }
        if let forwardedMessages = item.forwardedMessage {
            forwardedMessages.forEach { forwardedMessage in
                if let posts = forwardedMessage.posts {
                    postTypesString.append(contentsOf: returnNewsPostTypes(posts: posts))
                }
            }
        }
        
        let groupPostTypes = Dictionary(grouping: postTypesString) { $0 }
        postTypesString = groupPostTypes.map{( $0.key )}
        
        let postTypes: [NewsPostType] = postTypesString.compactMap { postType in
            getNewsPostType(postType: postType)
        }
        return postTypes
    }
    
    
    private func returnNewsPostTypes(posts: [Post]) -> [String] {
        posts.compactMap { post in
            return post.postType
        }
    }
    
    private func getNewsPostType(postType: String) -> NewsPostType? {
        switch postType {
            case "video": return .video
            case "photo": return .photo
            case "link": return .link
            case "poll": return .poll
            default:
                assertionFailure()
                return nil
        }
    }
    
    //MARK: - Get image contents -
    private func getImageContents(item: NewsItem) async -> ImageContents {
        var propertiImages: PropertiImage?
        var imageCounts = 0
        if let posts = item.post  {
            propertiImages = await getPropertiImage(posts: posts)
            posts.forEach {
                if $0.photo != nil { imageCounts += 1 }
            }
        }
        
        if let forwardedMessages = item.forwardedMessage {
            for message in forwardedMessages {
                if let posts = message.posts, propertiImages == nil {
                    propertiImages = await getPropertiImage(posts: posts)
                    posts.forEach {
                        if $0.photo != nil { imageCounts += 1 }
                        
                    }
                }
            }
        }

        return ImageContents(propertiImage: propertiImages,
                             countImages: imageCounts)
    }
    
    private func getPropertiImage(posts: [Post]) async -> PropertiImage? {
        let widht: CGFloat = 325
        for post in posts {
            if let photo = post.photo,
               let maxResolution = photo.sizes.max(by: { $0.resolution < $1.resolution })
              /* let url = URL(string: "https://vk.com/bbplay_tmb?w=wall-131568277_\(photo.postID)") */ {
                
                let image = await loadImage(with: maxResolution.url)
                return PropertiImage(type: NewsPostType.photo,
                                     image: image,
                                     height: identifyImageHeight(size: maxResolution.size),
                                     width: widht)
            }
            
            if let video = post.video,
               let maxResolution = video.imageSizes.max(by: { $0.resolution < $1.resolution })
              /* let url = URL(string: "https://vk.com/video?z=video\(video.ownerID)_\(video.id)_\(video.accessKey)") */ {

                let image = await loadImage(with: maxResolution.url)
                return PropertiImage(type: NewsPostType.video,
                                     image: image,
                                     height: identifyImageHeight(size: maxResolution.size),
                                     width: widht)
            }
            if let linkImage = post.link?.photo,
               let maxResolution = linkImage.sizes.max(by: { $0.resolution < $1.resolution })
            /* let url = URL(string: "https://vk.com/bbplay_tmb?w=wall-131568277_\(linkImage.postID)") */ {

                let image = await loadImage(with: maxResolution.url)
                return PropertiImage(type: NewsPostType.link,
                                     image: image,
                                     height: identifyImageHeight(size: maxResolution.size),
                                     width: widht)
            }
        }
        return nil
    }
    
    // MARK: - Load image
    private func loadImage(with stringUrl: String) async -> UIImage? {
        let result = Task {
            if let cachedImage = CacheManager.getCachedImage(with: stringUrl) {
                return Optional(cachedImage)
            }
            
            guard let url = URL(string: stringUrl),
                  let data = try? Data(contentsOf: url),
                  let image = UIImage(data: data) else { return nil }
            
            CacheManager.saveImageForCache(by: image, and: stringUrl)
            return image
        }
        
        return await result.value
    }
    
    private func identifyImageHeight(size: CGSize) -> CGFloat {
        let widthImageInMaket: CGFloat = 325.0
        let aspectRatio = CGFloat(size.height/size.width)
        return widthImageInMaket * aspectRatio
    }
    
    //MARK: - Get links -
    private func getLinksInPost(item: NewsItem) -> [LinkInPost] {
        var links: [LinkInPost] = []
        
        if let posts = item.post {
            posts.forEach {
                guard let link = $0.link,
                      let url = URL(string: link.url) else { return }
                links.append(LinkInPost(titleLink: link.title,
                                        descriptionLink: link.description,
                                        link: url))
            }
        }
        
        guard let forwardedMessages = item.forwardedMessage else { return links }
        forwardedMessages.forEach { message in
            guard let posts = message.posts else { return }
            posts.forEach { post in
                guard let link = post.link,
                      let url = URL(string: link.url) else { return }
                
                links.append(LinkInPost(titleLink: link.title,
                                        descriptionLink: link.description,
                                        link: url))
            }
        }
        return links
    }
    
    //MARK: - Get Video info in post -
    private func getVideosInPost(item: NewsItem) -> [VideoInPost] {
        var videos: [VideoInPost] = []
        
        if let posts = item.post {
            for post in posts {
                guard let video = post.video,
                      let url = URL(string: "https://vk.com/video?z=video\(video.ownerID)_\(video.id)_\(video.accessKey)") else {
                    continue
                }
                videos.append(VideoInPost(titleVideo: video.title,
                                          descriptionVideo: video.description,
                                          linkVideo: url))
            }
        }
        
        guard let forwardedMessages = item.forwardedMessage else { return videos }
        for forwardedMessage in forwardedMessages {
            guard let posts = forwardedMessage.posts else { continue }
            for post in posts {
                guard let video = post.video,
                      let url = URL(string: "https://vk.com/video?z=video\(video.ownerID)_\(video.id)_\(video.accessKey)") else {
                    continue
                }
                videos.append(VideoInPost(titleVideo: video.title,
                                          descriptionVideo: video.description,
                                          linkVideo: url))
            }
        }
        return videos
    }
}
