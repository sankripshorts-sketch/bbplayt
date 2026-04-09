import Foundation
import UIKit

protocol RoomsConverter {
    func convert(roomResponse: RoomsResponse) -> GameRooms
}

struct RoomsConverterImpl: RoomsConverter {
    func convert(roomResponse: RoomsResponse) -> GameRooms {
        let rightCoordinate = getRightCoordinate(with: roomResponse.data.rooms)
        let bottomCoordinate = getBottomCoordinate(with: roomResponse.data.rooms)

        let roomScale = getRoomScale(
            rightCoordinate: rightCoordinate,
            bottomCoordinate: bottomCoordinate
        )

        let roomWidth = (rightCoordinate * roomScale).scale()
        let roomHeight = (bottomCoordinate * roomScale).scale()
        let roomSize = CGSize(width: roomWidth, height: roomHeight)

        let rooms = roomResponse.data.rooms.map { room -> GameRooms.GameRoom in
            let computers = room.pcsList.map { pc -> Computer in
                let pcSize: CGFloat = 42.0
                let textSize: CGFloat = 14.0
                let insetX = getLeftInset(
                    pcs: room.pcsList,
                    pcSize: pcSize,
                    roomWidth: room.areaFrameWidth
                )
                let insetY = getTopInset(
                    pcs: room.pcsList,
                    pcSize: pcSize,
                    roomHeight: room.areaFrameHeight
                )
                return .init(
                    name: pc.pcName,
                    roomName: room.areaName,
                    status: pc.pcEnabled == 0 ? .unavailable : .free,
                    position: .init(
                        top: (pc.pcBoxTop * roomScale + insetY * roomScale).scale(),
                        left: (pc.pcBoxLeft * roomScale + insetX * roomScale).scale(),
                        width: (pcSize * roomScale).scale(),
                        height: (pcSize * roomScale).scale()
                    ),
                    textSize: textSize * roomScale
                )
            }

            return .init(
                name: room.areaName,
                roomFrame: .init(
                    x: (room.areaFrameX * roomScale).scale(),
                    y: (room.areaFrameY * roomScale).scale(),
                    height: (room.areaFrameHeight * roomScale).scale(),
                    width: (room.areaFrameWidth * roomScale).scale()
                ),
                computers: computers,
                textColor: UIColor(hex: room.colorText),
                borderColor: UIColor(hex: room.colorBorder)
            )
        }
        
        return .init(
            roomSize: roomSize,
            rooms: rooms
        )
    }

    // MARK: - Room scale
    private func getRoomScale(
        rightCoordinate: CGFloat,
        bottomCoordinate: CGFloat
    ) -> CGFloat {
        let height: CGFloat = 170 // высота контента в скролл вью, где отображается весь контент
        let widht: CGFloat = 375 // ширина референс экрана

        guard rightCoordinate != .zero && bottomCoordinate != .zero else {
            return 1
        }

        if rightCoordinate > bottomCoordinate, widht/height < rightCoordinate/bottomCoordinate {
            return widht/rightCoordinate
        } else {
            return height/bottomCoordinate
        }
    }

    private func getRightCoordinate(
        with rooms: [RoomsResponse.RoomData.Room]
    ) -> CGFloat {
        let rightXCoordinate = rooms.map { room in
            return room.areaFrameX + room.areaFrameWidth
        }
        return rightXCoordinate.sorted().last ?? .zero
    }

    private func getBottomCoordinate(
        with rooms: [RoomsResponse.RoomData.Room]
    ) -> CGFloat {
        let bottomYCoordinate = rooms.map { room in
            return room.areaFrameY + room.areaFrameHeight
        }
        return bottomYCoordinate.sorted().last ?? .zero
    }

    // MARK: - Computer position
    private func getLeftInset(
        pcs: [RoomsResponse.RoomData.Room.PC],
        pcSize: CGFloat,
        roomWidth: CGFloat
    ) -> CGFloat {
        let pcPosition = pcs.map { $0.pcBoxLeft }

        guard let lastPosition = pcPosition.max() else { return 0 }
        return (roomWidth - lastPosition - pcSize) / 2.0
    }

    private func getTopInset(
        pcs: [RoomsResponse.RoomData.Room.PC],
        pcSize: CGFloat,
        roomHeight: CGFloat
    ) -> CGFloat {
        let pcPosition = pcs.map { $0.pcBoxTop }

        guard let lastPosition = pcPosition.max() else { return 0 }
        return (roomHeight - lastPosition - pcSize) / 2.0
    }
}
