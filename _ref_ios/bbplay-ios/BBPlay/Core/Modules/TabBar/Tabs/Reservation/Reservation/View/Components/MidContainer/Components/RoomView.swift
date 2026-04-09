import Foundation
import SnapKit

final class RoomView: UIView {
    
    private let title = UILabel()
    
    init(frame: CGRect, and room: GameRooms.GameRoom) {
        super.init(frame: frame)
        setupUI()
        setupRoomView(with: room)
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    func setPCTapAction(_ action: @escaping StringClosure) {
        subviews.forEach { computer in
            guard let computer = computer as? ComputerView else { return }
            computer.setAction(action)
        }
    }
    
    func selectedComputer(with pcName: String) {
        subviews.forEach { computer in
            guard let computer = computer as? ComputerView else { return }
            if computer.pcName == pcName {
                computer.changeComputerStatus(on: .selected)
            }
            else if computer.computerStatus == .selected {
                computer.changeComputerStatus(on: .free)
            }
        }
    }
}

private extension RoomView {
    func setupUI() {
        backgroundColor = .clear
        isUserInteractionEnabled = true
        setupTitle()
    }
    
    func setupTitle() {
        addSubview(title)
        
        title.snp.makeConstraints {
            $0.top.equalToSuperview().offset(-19.scale())
            $0.centerX.equalToSuperview()
            $0.height.equalTo(16.scale())
        }
    }
    
    func setupRoomView(with room: GameRooms.GameRoom) {
        switch room.roomType {
            case .bootCamp:
                setupBootCamp(with: room)
            case .gameZone:
                setupGameZone(with: room)
            case .undefined: break
        }
    }

    func setupBootCamp(with room: GameRooms.GameRoom) {
        layer.borderColor = room.borderColor?.cgColor
        layer.cornerRadius = 6
        layer.borderWidth = 2.scale()
        title.text = Localizable.bootCamp()
        title.font = Font.dinRoundProBold(size: 14.scale())
        title.textColor = room.textColor
        setupComputer(with: room)
    }

    func setupGameZone(with room: GameRooms.GameRoom) {
        title.text = Localizable.gameZone()
        title.font = Font.dinRoundProBold(size: 14.scale())
        title.textColor = room.textColor
        setupComputer(with: room)
    }

    func setupComputer(with room: GameRooms.GameRoom) {
        room.computers.forEach { computer in
            let width = computer.position.width
            let height = computer.position.height
            let textSize = computer.textSize

            let frame = CGRect(
                x: computer.position.left,
                y: computer.position.top,
                width: width,
                height: height)
            
            let computerModel = ComputerView.Model(status: computer.status,
                                                   name: computer.name,
                                                   textSize: textSize)
            let pcView = ComputerView(frame: frame,
                                      model: computerModel)
            addSubview(pcView)
        }
    }
}
