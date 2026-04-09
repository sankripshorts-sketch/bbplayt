import Foundation
import Alamofire
import YooKassaPayments

protocol ReplenishNetworkAPI {
    func createOrder(data: CreateOrderData) async throws -> OrderResponse
    func checkPaymentStatus(with memberId: Int) async throws -> [OrderResponse]?
}

extension NetworkService: ReplenishNetworkAPI {
    func createOrder(data: CreateOrderData) async throws -> OrderResponse {
        let url = NetworkEnvironment.baseProxyUrlProd + data.endPoint

        return try await AF.request(
            url,
            method: .post,
            parameters: data.parameters,
            encoding: JSONEncoding.default,
            headers: proxyDefaultHeaders
        )
        .validate()
        .serializingDecodable(OrderResponse.self)
        .value
    }

    func checkPaymentStatus(with memberId: Int) async throws -> [OrderResponse]? {
        let url = NetworkEnvironment.baseProxyUrlProd + "/check-member-payments"
        
        let params = ["member_id": memberId]
        
        return try await AF.request(url,
                                    method: .post,
                                    parameters: params,
                                    encoding: JSONEncoding.default,
                                    headers: proxyDefaultHeaders)
        .validate()
        .serializingDecodable(Optional<[OrderResponse]>.self)
        .value
    }
}

struct CreateOrderData {

    let paymentToken: String
    let paymentType: PaymentMethodType
    let memberId: String
    let phone: String
    let email: String?
    let amount: String

    var parameters: [String: String] {
        var parameters = [
            "client_id": memberId,
            "phone": phone,
            "email": email,
            "value": amount,
            "token": paymentToken,
            "currency": "RUB"
        ].compactMapValues { $0 }

        if paymentType == .sberbank {
            parameters["paymentType"] = "sberbank"
            parameters["confirmation_return_url"] = "bbplay.sberbank://invoicing/sberpay"
        }

        return parameters
    }

    var endPoint: String {
        return "/create-payment-v2"
    }

}
