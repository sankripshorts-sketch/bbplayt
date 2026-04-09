import Foundation
import CryptoKit

// MARK: - Format phone number -
extension String {
    func formatPhoneNumber() -> String {
        let cleanPhoneNumber = components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        let mask = "+X XXX XXX XX XX"
        
        var result = ""
        
        var index = cleanPhoneNumber.startIndex
        
        for ch in mask where index < cleanPhoneNumber.endIndex {
            if ch == "X" {
                result.append(cleanPhoneNumber[index])
                index = cleanPhoneNumber.index(after: index)
            } else {
                result.append(ch)
            }
        }
        return result
    }
}

// MARK: - Format Verification Code -
extension String {
    func formatVerificationCode() -> String {
        let cleanVerificationCode = components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        let mask = "XXXX"
        
        var result = ""
        
        var index = cleanVerificationCode.startIndex
        
        for ch in mask where index < cleanVerificationCode.endIndex {
            if ch == "X" {
                result.append(cleanVerificationCode[index])
                index = cleanVerificationCode.index(after: index)
            } else {
                result.append(ch)
            }
        }
        return result
    }
}

// MARK: - Format BirthDay -
extension String {
    func formatBirthdayDate() -> String {
        let cleanDate = components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        let mask = "XX.XX.XXXX"
        
        var result = ""
        
        var index = cleanDate.startIndex
        
        for ch in mask where index < cleanDate.endIndex {
            if ch == "X" {
                result.append(cleanDate[index])
                index = cleanDate.index(after: index)
            } else {
                result.append(ch)
            }
        }
        return result
    }
}

// MARK: - SHA256
extension String {
    func sha256() -> String {
        let data = Data(self.utf8)
        let sha256 = SHA256.hash(data: data)
        return "*\(sha256.compactMap { String(format: "%02x", $0) }.joined())"
    }
}

// MARK: - md5
extension String {
    func md5() -> String {
        let data = Data(self.utf8)
        let md5 = Insecure.MD5.hash(data: data)
        return md5.description.replacingOccurrences(of: "MD5 digest: ", with: "")
    }
}
// MARK: - Birth to date -
extension String {
    func toDate(dateFormatter: DateFormatter) -> Date? {
        return dateFormatter.date(from: self)
    }
    
    func checkDate() -> Bool {
        let dateFormatter = DateFormatter(format: "dd.MM.yyyy")
        return self.toDate(dateFormatter: dateFormatter) != nil
    }
    
    func convertBirthdayFromBack() -> String {
        let dataFormatter = DateFormatter(format: "yyyy-MM-dd")
        guard let date = self.toDate(dateFormatter: dataFormatter) else {
            logger.error("date is nil")
            return self
        }
        let dataFormatterToString = DateFormatter(format: "dd.MM.yyyy")
        return dataFormatterToString.string(from: date)
    }
    
    func convertBirthdayToBack() -> String {
        let dataFormatter = DateFormatter(format: "dd.MM.yyyy")
        guard let date = self.toDate(dateFormatter: dataFormatter) else {
            logger.error("date is nil")
            //assertionFailure()
            return self
        }
        let dataFormatterToString = DateFormatter(format: "yyyy-MM-dd")
        return dataFormatterToString.string(from: date)
    }
}

// MARK: - Remove string after dot
extension String {
    func splitValue() -> String {
        return self.components(separatedBy: ".")[0]
    }
}

// MARK: - Remove incorrect phone symbols
extension String {
    func leaveOnlyNumbers() -> String {
        let whiteList = ["0":"0",
                         "1":"1",
                         "2":"2",
                         "3":"3",
                         "4":"4",
                         "5":"5",
                         "6":"6",
                         "7":"7",
                         "8":"8",
                         "9":"9"]
        var correctPhoneString = ""
        for symbol in self {
            if let symbol = whiteList[String(symbol)] {
                correctPhoneString += symbol
            } 
        }
        return correctPhoneString
    }
}

// MARK: - Email validator -
extension String {
    func makeValidEmail() -> Self? {
        let range = NSRange(location: 0, length: self.utf16.count)

        guard
            let detector = try? NSDataDetector(
                types: NSTextCheckingResult.CheckingType.link.rawValue
            )
        else {
            return nil
        }

        let matches = detector.matches(in: self, options: [], range: range)

        let isValid = matches.count == 1 &&
        matches.first?.url?.absoluteString.contains("mailto:") == true

        return isValid ? self : nil
    }
}

// MARK: - Convert to LocalTime -
extension String {
    func convertToLocalTime() -> LocalTime? {
        let components = self.components(separatedBy: ":")
        guard
            let stringHour = components[safe: 0],
            let stringMinute = components[safe: 1],
            let intHour = Int(stringHour),
            let intMinute = Int(stringMinute)
        else {
            return nil
        }
        
        return .init(hour: intHour, minute: intMinute)
    }
}
