import Foundation

protocol AvailableComputerUseCase {
    /// Получает модель доступности компьютера по имени выбранного компьютера с карты клуба
    func availablePC(by name: String) -> AvailablePCModel?
    
    /// Обновляет массив компьютеров, принимает модель для сетевого запроса
    func availablePCs(data: AvailableComputerUseCaseInputData) async throws ->  [AvailablePCsForBookingResponse.Data.PC]
    
    func clear()
}
