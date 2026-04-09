import Foundation
import Alamofire

protocol NewsNetworkAPI {
    func getNewsFeed() async throws -> NewsResponse
}

final class NewsNetworkAPIImpl: NewsNetworkAPI {

    private let ownerId: String

    private let header = HTTPHeader(
        name: "Authorization",
        value: "Bearer 787071117870711178707111307b63465677870787071111c6df96e084d083a36e52fc5")
    
    init(with ownerId: String) {
        self.ownerId = ownerId
    }

    func getNewsFeed() async throws -> NewsResponse {
        let url = "https://api.vk.com/method/wall.get?"
        let parameters = [
            "owner_id" : "-\(ownerId)",
            "count" : "30",
            "v" : "5.131",
            "oauth" : "1"
        ]
        
        return try await AF.request(url,
                                    method: .post,
                                    parameters: parameters,
                                    headers: [header])
            .validate(statusCode: [200])
            .serializingDecodable(NewsResponse.self)
            .value
    }
}

