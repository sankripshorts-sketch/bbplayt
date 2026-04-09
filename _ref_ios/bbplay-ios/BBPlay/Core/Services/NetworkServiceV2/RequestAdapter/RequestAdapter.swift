import Foundation

/// Адаптирует запрос в случае ошибки
protocol RequestAdapter {
    func adapt(urlRequest: inout URLRequest) throws
}
