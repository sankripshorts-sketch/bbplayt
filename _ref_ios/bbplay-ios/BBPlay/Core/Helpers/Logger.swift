import Foundation

let logger = DefaultLogger()

final class DefaultLogger {
    
    private enum LogEvent: String {
        case error
        case info
        case debug
        case verbose
        case warning
    }
    
    static let dateFormat = "dd/MM hh:mm:ss"
    static var dateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = dateFormat
        formatter.locale = Locale.current
        formatter.timeZone = TimeZone.current
        return formatter
    }

    private func sourceFileName(filePath: String) -> String {
        let components = filePath.components(separatedBy: "/")
        return components.isEmpty ? "" : components.last!
    }
    
    func error(_ object: Any,
               filename: String = #file,
               line: Int = #line,
               column: Int = #column,
               funcName: String = #function) {
        print("\(Date().toString()) \(LogEvent.error.rawValue) [\(sourceFileName(filePath: filename))]:\(line) \(funcName) -> \(object)")
    }

    func info(_ object: Any,
              filename: String = #file,
              line: Int = #line,
              column: Int = #column,
              funcName: String = #function) {

        print("\(Date().toString()) \(LogEvent.info.rawValue) [\(sourceFileName(filePath: filename))]:\(line) \(funcName) -> \(object)")
    }

    func debug(_ object: Any,
               filename: String = #file,
               line: Int = #line,
               column: Int = #column,
               funcName: String = #function) {
        print("\(Date().toString()) \(LogEvent.debug.rawValue) [\(sourceFileName(filePath: filename))]:\(line) \(funcName) -> \(object)")
    }

    func verbose(_ object: Any,
                 filename: String = #file,
                 line: Int = #line,
                 column: Int = #column,
                 funcName: String = #function) {
        print("\(Date().toString()) \(LogEvent.verbose.rawValue) [\(sourceFileName(filePath: filename))]:\(line) \(funcName) -> \(object)")
    }

    func warning(_ object: Any,
               filename: String = #file,
               line: Int = #line,
               column: Int = #column,
               funcName: String = #function) {
        print("\(Date().toString()) \(LogEvent.warning.rawValue) [\(sourceFileName(filePath: filename))]:\(line) \(funcName) -> \(object)")
    }
}

