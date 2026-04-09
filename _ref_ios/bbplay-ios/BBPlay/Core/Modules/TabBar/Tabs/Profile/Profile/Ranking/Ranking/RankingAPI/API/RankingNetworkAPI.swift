import Foundation
import Alamofire
import UIKit

// TODO: - Fix url -

final class RankingNetworkAPI {
    func getGameRank(with game: String) async throws -> GameRanks {
        let url = "https://eu9.icafecloud.com/rank.php?action=ajax_rank_data&code=\(game)-cafe-player&icafe_id=74922"
        
        return try await AF.request(url)
        .validate(statusCode: [200])
        .serializingDecodable(GameRanks.self)
        .value
    }
}
