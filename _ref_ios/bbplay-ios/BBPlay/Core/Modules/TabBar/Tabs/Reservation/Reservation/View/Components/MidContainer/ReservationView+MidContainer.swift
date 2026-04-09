import Foundation
import UIKit
import SnapKit

extension ReservationView {
    final class MidContainer: UIView {
        private let titleContainer = UIView()
        private let pcImageView = UIImageView()
        private let title = UILabel()
        
        private let bookingContainer = UIView()
        private let scrollView = UIScrollView()
        private let pcMapContainer = UIView()
        private let roomContainer = UIView()
        private let pcStatusView = PCStatusView()
        
        private let loaderActivityIndicator = ActivityIndicator(
            colors: [.white],
            lineWidth: 6.scale()
        )
        
        override init(frame: CGRect) {
            super.init(frame: frame)
            setupAppearance()
        }
        
        @available(*, unavailable)
        required init?(coder: NSCoder) { nil }
        
        func setPCRoomTapAction(action: @escaping StringClosure) {
            let roomViews = roomContainer.subviews
                .compactMap { $0 as? RoomView }
            roomViews.forEach { room in
                room.setPCTapAction(action)
            }
        }
        
        func updateRoomLoaderIndicator(isLoading: Bool) {
            loaderActivityIndicator.isHidden = !isLoading
            loaderActivityIndicator.isAnimating = isLoading
            roomContainer.isHidden = isLoading
        }
        
        func updateGameRooms(with rooms: GameRooms) {
            roomContainer.subviews.forEach {
                guard $0 is RoomView else { return }
                $0.removeFromSuperview()
            }
            
            rooms.rooms.forEach { room in
                let frame = CGRect(
                    x: room.roomFrame.x,
                    y: room.roomFrame.y,
                    width: room.roomFrame.width,
                    height: room.roomFrame.height
                )
                let roomView = RoomView(frame: frame, and: room)
                roomContainer.addSubview(roomView)
            }
            
            updateRoomContainer(with: rooms.roomSize)
        }
        
        func selectedComputer(with pcName: String) {
            roomContainer.subviews.forEach { room in
                guard let room = room as? RoomView else { return }
                room.selectedComputer(with: pcName)
            }
        }
        
        func updateStatePCView(with state: SelectedView.ViewState) {
            bookingContainer.alpha = state == .deselected ? 0.4 : 1
            scrollView.isUserInteractionEnabled = state != .deselected
            
            let color = state == .deselected ? Color.commonText()! : .white
            pcImageView.image = pcImageView.image?.withTintColor(color)
            title.textColor = color
        }
        
        private func setupAppearance() {
            scrollView.delegate = self
            
            addSubview(titleContainer)
            titleContainer.snp.makeConstraints {
                $0.top.equalToSuperview()
                $0.centerX.equalToSuperview()
            }
            
            pcImageView.image = Image.reservationPc()?.withTintColor(.white)
            
            titleContainer.addSubview(pcImageView)
            pcImageView.snp.makeConstraints {
                $0.left.verticalEdges.equalToSuperview().inset(2.scale())
                $0.size.equalTo(20.scale())
            }
            
            title.text = Localizable.selectPlace()
            title.font = Font.dinRoundProMedi(size: 20.scale())
            title.textColor = .white
            
            titleContainer.addSubview(title)
            title.snp.makeConstraints {
                $0.left.equalTo(pcImageView.snp.right).offset(8.scale())
                $0.right.verticalEdges.equalToSuperview()
            }
            
            addSubview(bookingContainer)
            bookingContainer.snp.makeConstraints {
                $0.top.equalTo(titleContainer.snp.bottom).offset(8.scale())
                $0.horizontalEdges.bottom.equalToSuperview()
            }
            
            scrollView.isUserInteractionEnabled = true
            scrollView.backgroundColor = Color.bookingBackground()
            scrollView.isScrollEnabled = true
            scrollView.showsVerticalScrollIndicator = false
            scrollView.showsHorizontalScrollIndicator = false
            scrollView.contentInsetAdjustmentBehavior = .never
            scrollView.alwaysBounceVertical = false
            scrollView.alwaysBounceHorizontal = false
            scrollView.minimumZoomScale = 1.0
            scrollView.maximumZoomScale = 2.0
            
            bookingContainer.addSubview(scrollView)
            scrollView.snp.makeConstraints {
                $0.top.centerX.equalToSuperview()
                $0.width.equalTo(375.scale())
                $0.height.equalTo(215.scale())
            }
            
            scrollView.addSubview(pcMapContainer)
            pcMapContainer.snp.makeConstraints {
                $0.edges.equalTo(scrollView.contentLayoutGuide.snp.edges)
                $0.width.height.equalTo(scrollView)
            }
            
            pcMapContainer.addSubview(roomContainer)
            
            bookingContainer.addSubview(pcStatusView)
            pcStatusView.snp.makeConstraints {
                $0.top.equalTo(scrollView.snp.bottom).offset(8.scale())
                $0.left.right.equalToSuperview().inset(32.scale())
                $0.bottom.equalToSuperview().inset(10.scale())
            }
            
            loaderActivityIndicator.isAnimating = false
            loaderActivityIndicator.isHidden = true
            
            addSubview(loaderActivityIndicator)
            loaderActivityIndicator.snp.makeConstraints {
                $0.center.equalTo(pcMapContainer)
                $0.size.equalTo(48.scale())
            }
        }
        
        private func updateRoomContainer(with size: CGSize) {
            roomContainer.snp.makeConstraints {
                $0.center.equalToSuperview()
                $0.height.equalTo(size.height)
                $0.width.equalTo(size.width)
            }
        }
    }
}

// MARK: - UIScrollViewDelegate -
extension ReservationView.MidContainer: UIScrollViewDelegate {
    func viewForZooming(in scrollView: UIScrollView) -> UIView? {
        return pcMapContainer
    }
}
