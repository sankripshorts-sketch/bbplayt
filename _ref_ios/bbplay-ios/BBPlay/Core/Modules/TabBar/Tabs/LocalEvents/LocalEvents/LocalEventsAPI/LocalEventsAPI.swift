import Foundation
import Alamofire

protocol LocalEventsAPI {
    func getLocalEvents() async throws -> LocalEventsResponse
    func getMembersByEvent(with eventId: String) async throws -> LocalEventWithMembersResponse
    func checkReward(with eventId: String, memberId: String) async throws -> CheckRewardResponse
    func getReward(with eventId: String,
                   memberId: String,
                   privateKey: String, rewardSum: Int) async throws -> GetRewardResponse
}

extension NetworkService: LocalEventsAPI {
    func getLocalEvents() async throws -> LocalEventsResponse {
        let endPoint = "/events"
        return try await request(of: LocalEventsResponse.self,
                                 for: "76301",
                                 endPoint: endPoint)
    }
    
    func getMembersByEvent(with eventId: String) async throws -> LocalEventWithMembersResponse {
        let endPoint = "/events/\(eventId)/detail"
        return try await request(of: LocalEventWithMembersResponse.self,
                                 for: "76301",
                                 endPoint: endPoint)
    }
    
    func checkReward(with eventId: String, memberId: String) async throws -> CheckRewardResponse {
        let endPoint = "/check-reward"
        
        let params = [
            "client_id": memberId,
            "event_id": eventId
        ]
        
        return try await request(of: CheckRewardResponse.self,
                                 for: "76301",
                                 endPoint: endPoint,
                                 method: .post,
                                 params: params,
                                 encoding: JSONEncoding.default,
                                 onBaseUrl: true)
    }
    
    func getReward(with eventId: String,
                   memberId: String,
                   privateKey: String, rewardSum: Int) async throws -> GetRewardResponse {
        let endPoint = "/get-reward"
        
        func randomCode(length: Int) -> String {
            let radix = 36
            let max = Int(pow(Double(radix), Double(length)))
            let number = Int.random(in: 0..<max)
            return String(number, radix: radix, uppercase: true)
        }
        
        let randomString = randomCode(length: 8)
        
        let key = (memberId + randomString + privateKey + secretKeyForGetReward).md5()
        
        let params: [String: Any] = [
            "client_id": memberId,
            "event_id": eventId,
            "rand_key": randomString,
            "key": key,
            "reward_amount": rewardSum
        ]
        
        return try await request(of: GetRewardResponse.self,
                                 for: "76301",
                                 endPoint: endPoint,
                                 method: .post,
                                 params: params,
                                 encoding: JSONEncoding.default,
                                 onBaseUrl: true)
    }
}
