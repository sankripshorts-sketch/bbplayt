import XCTest
@testable import BBPlay

final class AnalyticsManagerImplTest: XCTestCase {

    var mockAppMetricaBackend: MockAppMetricaBackend!
    var sut: AnalyticsManagerImpl!
    var account: Account!

    override func setUp() {
        super.setUp()
        mockAppMetricaBackend = MockAppMetricaBackend()
        sut = AnalyticsManagerImpl(
            appMetrica: mockAppMetricaBackend
        )

        account = Account(
            memberId: 0,
            memberNickname: "testNickname",
            memberBalance: "0",
            memberFirstName: "testFirstName",
            memberLastName: "testLastName",
            memberBirthday: "testBirthday",
            memberPhone: "testPhone",
            memberEmail: "example@mail.com",
            memberPoints: "testPoints",
            memberBalanceBonus: "testBalanceBonus",
            memberCoinBalance: "testCoinBalance",
            memberIsActive: 1,
            memberPrivateKey: "testPrivateKey",
            needPhoneVerify: false,
            isFirstPayment: false
        )

    }
    
    override func tearDown() {
        mockAppMetricaBackend = nil
        sut = nil
        account = nil
        super.tearDown()
    }

    func testUpdateAnalyticalInfo() {
        sut.updateAnalyticalInfo(with: account)
        
        XCTAssertEqual(mockAppMetricaBackend.setUserIdCalledCount, 1)
        XCTAssertNotNil(mockAppMetricaBackend.userId)
    }
    
    func testUpdateAnalyticalInfoWithNilAccount() {
        sut.updateAnalyticalInfo(with: nil)
        
        XCTAssertEqual(mockAppMetricaBackend.setUserIdCalledCount, 0)
        XCTAssertNil(mockAppMetricaBackend.userId)
    }
    
    func testSendEventWithNilAccount() {
        sut.updateAnalyticalInfo(with: nil)
        
        let analyticsEventName = AnalyticEventName.loginSuccess
        sut.sendEvent(with: analyticsEventName)
        
        XCTAssertEqual(mockAppMetricaBackend.sendEventCalledCount, 1)
        XCTAssertEqual(mockAppMetricaBackend.eventName, analyticsEventName.localized)
        XCTAssertNotNil(mockAppMetricaBackend.eventParams)
    }

    func testSendEvent() {
        sut.updateAnalyticalInfo(with: account)

        let analyticsEventName = AnalyticEventName.loginSuccess
        sut.sendEvent(with: analyticsEventName)

        XCTAssertEqual(mockAppMetricaBackend.sendEventCalledCount, 1)
        XCTAssertEqual(mockAppMetricaBackend.eventName, analyticsEventName.localized)
        XCTAssertNotNil(mockAppMetricaBackend.eventParams)
    }

    func testSendEventWithParams() {
        sut.updateAnalyticalInfo(with: account)

        let analyticsEventName = AnalyticEventName.loginSuccess
        let params: AnalyticEventParameters = .createAmountParams(with: "0")
        sut.sendEvent(with: analyticsEventName, params: params)
        
        XCTAssertEqual(mockAppMetricaBackend.sendEventCalledCount, 1)
        XCTAssertEqual(mockAppMetricaBackend.eventName, analyticsEventName.localized)
        
        let mergedParams: [String: Any] = (mockAppMetricaBackend.eventParams?.merge(params.customParameters))!
        XCTAssertNotNil(mockAppMetricaBackend.eventParams)
        XCTAssertEqual(mergedParams.count, mockAppMetricaBackend.eventParams?.count)

    }
    
    func testSendEventWithParamsAndNilAccount() {
        sut.updateAnalyticalInfo(with: nil)
        
        let analyticsEventName = AnalyticEventName.loginSuccess
        let params: AnalyticEventParameters = .createAmountParams(with: "0")
        sut.sendEvent(with: analyticsEventName, params: params)
        
        XCTAssertEqual(mockAppMetricaBackend.sendEventCalledCount, 1)
        XCTAssertEqual(mockAppMetricaBackend.eventName, analyticsEventName.localized)
        
        let mergedParams: [String: Any] = (mockAppMetricaBackend.eventParams?.merge(params.customParameters))!
        XCTAssertNotNil(mockAppMetricaBackend.eventParams)
        XCTAssertEqual(mergedParams.count, mockAppMetricaBackend.eventParams?.count)
        
    }

}
