import Foundation
import UIKit

final class LocalEventsConverter {
    func getLocalEventsList(with response: LocalEventsResponse) async throws -> [String] {
        guard response.code == 200 else {
            let error = NSError(domain: response.message, code: response.code)
            throw error
        }
        
        guard let data = response.data else {
            let error = NSError(domain: "Data is nil", code: response.code)
            throw error
        }
        
        return data.map { $0.eventId }
    }
    
    func getEventWithMembers(with response: LocalEventWithMembersResponse) async throws -> EventWithMembers {
        guard response.code == 200 else {
            let error = NSError(domain: response.message,
                                code: response.code)
            throw error
        }
        
        guard let data = response.data else {
            let error = NSError(domain: "Data is nil",
                                code: response.code)
            throw error
        }
        
        let dates = try convertDates(with: data.event.eventStartTimeUtc,
                                     data.event.eventEndTimeUtc)
        
        let eventInfo = EventInfo(eventId: data.event.eventId,
                                  gameCode: data.event.eventGameCode,
                                  description: data.event.eventDescription,
                                  startEventTime: dates.startEventTime,
                                  endEventTime: dates.endEventTime,
                                  eventStatus: data.event.eventStatus)
        
        let memberInfos = data.members.map {
            MemberInfo(memberId: $0.ememberId,
                       nickname: $0.ememberMemberAccount,
                       points: String($0.ememberPoint),
                       rank: $0.ememberRank)
        }
        
        return EventWithMembers(event: eventInfo, members: memberInfos)
    }
    
    func convertGetReward(with response: GetRewardResponse) -> (RewardStatus, String) {
        guard response.code == 1 else { return (.takenReward, response.message) }
        return (.notTakenReward, response.message)
    }
}

// MARK: - Private -
private extension LocalEventsConverter {
    func convertDates(with startDate: String,
                      _ endDate: String) throws -> (startEventTime: Date, endEventTime: Date) {
        let formatter = DateFormatter()
        let secondsFromGMT = formatter.timeZone.secondsFromGMT(for: Date())
        let timeInterval = TimeInterval(secondsFromGMT)
        formatter.locale = .current
        formatter.calendar = .current
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        guard let startDateAsDate = formatter.date(from: startDate)?.addingTimeInterval(timeInterval),
              let endDateAsDate = formatter.date(from: endDate)?.addingTimeInterval(timeInterval) else {
            let error = NSError(domain: "Error convert data, in \(#function)", code: -1)
            throw error
        }
        return (startDateAsDate, endDateAsDate)
    }
}

// MARK: - Event Model -
struct EventWithMembers {
    let event: EventInfo
    let members: [MemberInfo]
}

struct EventInfo {
    let eventId: String
    let gameCode: String
    let description: String
    let startEventTime: Date
    let endEventTime: Date
    let eventStatus: EventStatus
}

struct MemberInfo {
    let memberId: String
    let nickname: String
    let points: String
    let rank: Int
}
