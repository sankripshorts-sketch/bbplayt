import Foundation
import YooKassaPayments
import Alamofire

final class ReplenishPresenterImpl {

    weak var view: ReplenishView?

    private let inputData: InputData?
    private let authManager: AuthManager
    private let analyticsManager: AnalyticsManager
    private let networkService: ReplenishNetworkAPI
    private let converter: ReplenishConverter
    private let amountFastPrices = [100, 200, 300, 500, 1000]
    private var currentAmount = 100

    init(
        inputData: InputData?,
        authManager: AuthManager,
        analyticsManager: AnalyticsManager,
        networkService: ReplenishNetworkAPI,
        converter: ReplenishConverter
    ) {
        self.inputData = inputData
        self.authManager = authManager
        self.analyticsManager = analyticsManager
        self.networkService = networkService
        self.converter = converter
    }

    private func updateView() {
        view?.updateView(with: amountFastPrices)
    }
    
    private func paymentAmountValidate(with amount: Int) -> Bool {
        return amount >= 100
    }

    private func createOrder(
        with paymentToken: String,
        paymentType: PaymentMethodType
    ) async throws -> String {
        guard let account = authManager.getAccount() else { throw PaymentError.emptyAccount }

        let response = try await networkService.createOrder(
            data: .init(
                paymentToken: paymentToken,
                paymentType: paymentType,
                memberId: String(account.memberId),
                phone: account.memberPhone.leaveOnlyNumbers(),
                email: inputData?.email ?? account.memberEmail,
                amount: String(currentAmount)
            )
        )
        
        sendEvent(eventName: .paymentRequestCreateOrder)
        
        if let confirmationUrl = response.confirmation?.confirmationUrl {
            return confirmationUrl
        } else {
            throw PaymentError.emptyConfirmationUrl(response.status)
        }
    }

}

// MARK: - ReplenishPresenter -

extension ReplenishPresenterImpl: ReplenishPresenter {

    func wasOpenPaymentBottomSheet() {
        sendPaymentStatusEvent(status: .loading)
    }
    
    func fastAmountTap(with index: Int) {
        let value = amountFastPrices[index]
        view?.updateTextField(with: value)
    }

    func onViewDidLoad() {
        updateView()
    }
    
    func viewDidAppear() {
        inputData?.openScreenCallback()
    }
    
    func paymentTap(with inputAmount: String) {
        guard let intAmount = Int(inputAmount) else {
            assertionFailure()
            logger.error("amount not convert to Int")
            return
        }
        
        guard paymentAmountValidate(with: intAmount) else {
            view?.openErrorAlert(with: Localizable.inputDescription())
            return
        }
        
        currentAmount = intAmount

        let amount = Amount(value: Decimal(intAmount), currency: .rub)
        let paymentMethodTypes: PaymentMethodTypes = [.sberbank, .bankCard, .sbp]
        let tokenizationSettings = TokenizationSettings(paymentMethodTypes: paymentMethodTypes)
        let tokenizationModuleInputData = TokenizationModuleInputData(
            clientApplicationKey: ReplenishConstants.clientApplicationKey,
            shopName: ReplenishConstants.shopName,
            shopId: ReplenishConstants.shopId,
            purchaseDescription: ReplenishConstants.purchaseDescription,
            amount: amount,
            tokenizationSettings: tokenizationSettings,
            isLoggingEnabled: true,
            savePaymentMethod: .userSelects,
            applicationScheme: "bbplay.sberbank://",
            customerId: authManager.getCustomerId() ?? "\(UUID())")
        let inputData: TokenizationFlow = .tokenization(tokenizationModuleInputData)
        
        let viewController = TokenizationAssembly.makeModule(
            inputData: inputData,
            moduleOutput: self
        )

        view?.openPaymentScreen(with: viewController)
        sendPaymentTapEvent(eventName: .paymentReplenishTapWithAmount, amount: inputAmount)
    }
    
    func checkPaymentStatus(_ status: @escaping (PaymentState) -> Void) {
        guard let memberId = authManager.getAccount()?.memberId else {
            status(.pending)
            sendPaymentStatusEvent(status: .pending)
            return
        }

        Task {
            do {
                let response = try await networkService.checkPaymentStatus(with: memberId)
                
                await MainActor.run {
                    guard let orderResponse = response?.last else {
                        //TODO: - думаю здесь лучше выводить ошибку что не найдены платежи по данному аккаунту или что то такое, так как отображение платежа в статусе - ошибочно
                        sendPaymentStatusEvent(status: .pending)
                        status(.pending)
                        return
                    }

                    let paymentStatus = converter.convertStatus(from: orderResponse.status)
                    status(paymentStatus)
                    sendPaymentStatusEvent(status: paymentStatus)
                }
            }
            catch let error {
                logger.error(error)
                await MainActor.run {
                    status(.pending)
                    sendPaymentStatusEvent(status: .pending)
                }
            }
        }
    }

    func updateAccount() {
        Task {
            do {
                try await authManager.updateAccount()
            }
            catch let error {
                logger.error(error)
            }
        }
    }

}

// MARK: - TokenizationModuleOutput -

extension ReplenishPresenterImpl: TokenizationModuleOutput {

    func didFinish(on module: TokenizationModuleInput,
                   with error: YooKassaPaymentsError?) {
        view?.closePaymentView()
    }

    func tokenizationModule(_ module: TokenizationModuleInput,
                            didTokenize token: Tokens,
                            paymentMethodType: PaymentMethodType) {
        Task {
            do {
                let confirmationUrl = try await createOrder(with: token.paymentToken, paymentType: paymentMethodType)
                
                await MainActor.run {
                    module.startConfirmationProcess(
                        confirmationUrl: confirmationUrl,
                        paymentMethodType: paymentMethodType
                    )
                }
                
                sendEvent(eventName: .paymentOpen3ds)
            } catch PaymentError.emptyConfirmationUrl(let status) {
                await MainActor.run {
                    let paymentStatus = converter.convertStatus(from: status)
                    view?.openBottomSheet(with: paymentStatus)
                    sendPaymentStatusEvent(status: paymentStatus)
                }
            } catch let error {
                logger.error(error)

                await MainActor.run {
                    view?.openErrorAlert(with: error.localizedDescription)
                }
            }
        }
    }

    func didFinishConfirmation(paymentMethodType: PaymentMethodType) {
        Task { @MainActor in
            view?.openStatusOrderBottomSheetAfterClosePayment(with: .loading)
        }
    }

    func didFailConfirmation(error: YooKassaPayments.YooKassaPaymentsError?) {}

}

//MARK: - Analytics -

private extension ReplenishPresenterImpl {
    
    func sendPaymentTapEvent(eventName: AnalyticEventName, amount: String) {
        let param = AnalyticEventParameters.createAmountParams(with: amount)
        analyticsManager.sendEvent(with: eventName, params: param)
    }
    
    func sendPaymentStatusEvent(status: PaymentState) {
        switch status {
            case .loading:
                analyticsManager.sendEvent(with: .paymentSheetLoader)
            case .success:
                analyticsManager.sendEvent(with: .paymentGreenCheck)
            case .pending:
                analyticsManager.sendEvent(with: .paymentGrayClock)
            case .error:
                analyticsManager.sendEvent(with: .paymentRedCross)
        }
    }
    
    func sendEvent(eventName: AnalyticEventName) {
        analyticsManager.sendEvent(with: eventName)
    }
    
}

// MARK: - InputData -

extension ReplenishPresenterImpl {
    
    struct InputData {
        let email: String
        let openScreenCallback: EmptyClosure
    }
    
}

// MARK: - Error -

private extension ReplenishPresenterImpl {
    
    enum PaymentError: Error {
        case emptyAccount
        case emptyConfirmationUrl(_ status: String)
    }
    
}
