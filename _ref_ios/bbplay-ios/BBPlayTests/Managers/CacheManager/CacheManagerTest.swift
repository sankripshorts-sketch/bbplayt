import XCTest
@testable import BBPlay
@testable import Kingfisher

final class CacheManagerTest: XCTestCase {

    override func setUp() {
        super.setUp()
        ImageCache.default.clearCache()
    }
    
    override func tearDown() {
        ImageCache.default.clearCache()
        super.tearDown()
    }

    func testGetCachedImageWithUrl() {
        let image: UIImage! = UIImage(systemName: "star")
        let key: String = "star_key"

        CacheManager.saveImageForCache(by: image, and: key)

        let loadedImage = CacheManager.getCachedImage(with: key)
        XCTAssertEqual(image.pngData(), loadedImage?.pngData())
    }
    
    func testGetCachedImageWithNilUrl() {
        let image: UIImage! = UIImage(systemName: "star")
        let key: String = "star_key"

        CacheManager.saveImageForCache(by: image, and: key)

        let anyKey: String = "anyKey"
        let loadedImage = CacheManager.getCachedImage(with: anyKey)

        XCTAssertNil(loadedImage)
    }

    func testSaveImageForCacheByImageAndKey() {
        let image: UIImage! = UIImage(systemName: "star")
        let key: String = "star_key"

        CacheManager.saveImageForCache(by: image, and: key)

        let loadedImage = CacheManager.getCachedImage(with: key)
        XCTAssertEqual(image.pngData(), loadedImage?.pngData())
    }

}
