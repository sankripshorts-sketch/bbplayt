import Foundation

final class ReservationUseCaseImpl: ReservationUseCase {
  
    private let accountManager: AccountManager
    private let networkService: NetworkService
    
    init(
        accountManager: AccountManager,
        networkService: NetworkService
    ) {
        self.accountManager = accountManager
        self.networkService = networkService
    }

    func addReservation(data: ReservationUseCaseData) async throws {
        guard let account = accountManager.getAccount() else {
            throw ReservationUseCaseError.accountNotFound
        }

        guard
            let privateKey = account.memberPrivateKey,
            let pcName = data.pcName,
            let product = data.product
        else {
            throw ReservationUseCaseError.reservationDataInputInvalid
        }

        guard
            let startDate = makeStartDate(data: data),
            let startTime = makeStartTime(data: data)
        else {
            throw ReservationUseCaseError.reservationDataInputInvalid
        }

        guard
            checkPaymentAvailable(
                accountBalance: account.memberBalance,
                product: product
            )
        else {
            throw ReservationUseCaseError.balanceInvalid
        }

        let response = try await networkService.addReservation(
            pcName: pcName,
            memberId: String(account.memberId),
            memberAccount: account.memberNickname,
            startDate: startDate,
            startTime: startTime,
            mins: String(product.bookingDurationMins),
            productId: product.id == -1 ? nil : product.id,
            privateKey: privateKey
        )
        
        try reservationResponseHandler(response)
    }

    private func reservationResponseHandler(
        _ response: AddReservationResponse
    ) throws {
        guard response.code == 3 else {
            throw ReservationUseCaseError.statusCodeInvalid(
                code: String(response.code),
                message: response.message ?? "Вложенное сообщение отсутствует"
            )
        }

        guard response.incorrectParameter == nil else {
            throw ReservationUseCaseError.parameterInvalid(
                code: String(response.code),
                message: response.incorrectParameter ?? "Параметр не определен"
            )
        }
    }

    private func checkPaymentAvailable(
        accountBalance: String,
        product: SinglePriceValue
    ) -> Bool {
        guard
            let accountBalanceFloat = Float(accountBalance),
            let productCostFloat = Float(product.cost)
        else { return false }
        return accountBalanceFloat >= productCostFloat
    }
    
    private func makeStartDate(data: ReservationUseCaseData) -> String? {
        if data.isExtendedSearch, let extendedDateStart = data.extendedDateStart {
            return extendedDateStart
        }
        return data.startDate
    }
    
    private func makeStartTime(data: ReservationUseCaseData) -> String? {
        if data.isExtendedSearch, let extendedTimeStart = data.extendedTimeStart {
            return extendedTimeStart.toString()
        }
        return data.product?.bookingTime.toString()
    }
}


struct ReservationUseCaseData {
    let pcName: String?
    let startDate: String?
    let product: SinglePriceValue?

    let extendedDateStart: String?
    let extendedTimeStart: LocalTime?
    let isExtendedSearch: Bool
}
