import Foundation
import Kingfisher
import Dispatch

final class CacheManager {
    
    static let config = MemoryStorage.Config(totalCostLimit: 100000)
    static let imageCache = ImageCache.default
    
    static func getCachedImage(with stringUrl: String) -> UIImage? {
        guard imageCache.isCached(forKey: stringUrl) else { return nil }
        return imageCache.retrieveImageInMemoryCache(forKey: stringUrl, options: .none)
    }
    
    static func saveImageForCache(by image: UIImage, and key: String) {
        imageCache.memoryStorage.store(value: image, forKey: key)
    }
}
