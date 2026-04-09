import Foundation

final class ReservationAdressConverter {
    func convertAdress(with model: AdressCafe) async throws -> AdressInfo {
        guard let data = model.data else {
            throw NSError(domain: model.message, code: -99)
        }
        
        let phoneNumber = data.info.phone
            .replacingOccurrences(of: "(", with: "")
            .replacingOccurrences(of: ")", with: "")
        
        return AdressInfo(adress: data.info.adress,
                          phone: phoneNumber,
                          lat: data.info.lat,
                          lng: data.info.lng,
                          website: data.info.website)
    }
}
