import Foundation

final class AvailableComputerUseCaseImpl: AvailableComputerUseCase {
    
    private let proxyNetworkService: NetworkServiceProtocol
    private var availablePCs: [AvailablePCsForBookingResponse.Data.PC] = []

    init(
        proxyNetworkService: NetworkServiceProtocol
    ) {
        self.proxyNetworkService = proxyNetworkService
    }

    func availablePC(by pcName: String) -> AvailablePCModel? {
        guard
            let availablePC = availablePCs.first(where: { $0.pcName == pcName })
        else {
            return nil
        }

        return .init(
            name: availablePC.pcName,
            isUsing: availablePC.isUsing,
            dateStart: availablePC.startDate,
            timeStart: availablePC.startTime?.convertToLocalTime(),
            groupName: availablePC.pcGroupName
        )
    }

    func availablePCs(data: AvailableComputerUseCaseInputData) async throws -> [AvailablePCsForBookingResponse.Data.PC] {
        let pcsResponse = try await proxyNetworkService.request(
            endpoint: AvailablePCsForBookingEndpoint.availablePCsForBooking(
                params: .init(
                    cafeId: data.cafeID,
                    dateStart: data.dateStart,
                    timeStart: data.timeStart,
                    mins: data.mins,
                    isFindWindow: data.isExtendedSearch,
                    priceName: data.priceName
                )
            )
        ).map(
            AvailablePCsForBookingResponse.self,
            ErrorResponse.self
        )

        availablePCs = pcsResponse.data.pcList
        return availablePCs
    }
    
    func clear() {
        availablePCs.removeAll()
    }
}

