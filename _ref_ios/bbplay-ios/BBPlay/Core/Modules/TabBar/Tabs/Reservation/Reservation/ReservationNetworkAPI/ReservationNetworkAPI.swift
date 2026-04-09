import Foundation
import Alamofire

protocol ReservationAPI {
    func getCafeAdress(for id: String?) async throws -> AdressCafe


    func getAllReservation() async throws -> BookingsResponse
    func addReservation(pcName: String,
                        memberId: String,
                        memberAccount: String,
                        startDate: String,
                        startTime: String,
                        mins: String,
                        productId: Int?,
                        privateKey: String) async throws -> AddReservationResponse
    
}

extension NetworkService: ReservationAPI {
    func getCafeAdress(for id: String? = nil) async throws -> AdressCafe {
        let endPoint = "/license/info"
        return try await request(of: AdressCafe.self, for: id, endPoint: endPoint)
    }


// MARK: - Reservation
    
    // Получаем список броней
    func getAllReservation() async throws -> BookingsResponse {
        let endPoint = "/bookings"
        return try await request(of: BookingsResponse.self, endPoint: endPoint)
    }

    // Бронируем место
    func addReservation(pcName: String,
                        memberId: String,
                        memberAccount: String,
                        startDate: String,
                        startTime: String,
                        mins: String,
                        productId: Int?,
                        privateKey: String) async throws -> AddReservationResponse {
        let endPoint = "/booking"
        
        func randomCode(length: Int) -> String {
            let radix = 36
            let max = Int(pow(Double(radix), Double(length)))
            let number = Int.random(in: 0..<max)
            return String(number, radix: radix, uppercase: true)
        }
        
        let randomString = randomCode(length: 8)
        
        let key = (memberId + randomString + privateKey + secretKeyForGetReward).md5()
        
        var params: [String: Any] = [
            "pc_name": pcName,
            "member_id": memberId,
            "member_account": memberAccount,
            "start_date": startDate,
            "start_time": startTime,
            "mins": mins,
            "rand_key": randomString,
            "key": key
        ]
        
        if let productId {
            let productIdDict = ["price_id": productId]
            params.mergeInPlace(productIdDict)
        }
        
        return try await request(of: AddReservationResponse.self,
                                 endPoint: endPoint,
                                 method: .post,
                                 params: params,
                                 encoding: JSONEncoding.default,
                                 onBaseUrl: true)
    }
}
