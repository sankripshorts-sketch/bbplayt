import Foundation
import SnapKit

final class ReservationView: UIView {
    private let scrollView = UIScrollView()
    private let topContainer = TopContainer()
    private let midContainer = MidContainer()
    private let bottomContainer = BottomContainer()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupAppearance()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }
    
    func updateAppearance() {
        bottomContainer.snp.updateConstraints {
            $0.bottom.equalToSuperview().inset(tabBarHeight)
        }

        let isScrollEnabled = bottomContainer.frame.minY <= midContainer.frame.maxY
        scrollView.isScrollEnabled = isScrollEnabled
        let bottomInset = midContainer.frame.maxY - bottomContainer.frame.minY
        scrollView.contentInset.bottom = bottomInset
        scrollView.contentSize = .init(
            width: scrollView.frame.width,
            height: scrollView.frame.height - 24.scale()
        )
    }
    
    // MARK: - TopContainer
    func setSelectClubAction(_ action: @escaping EmptyClosure) {
        topContainer.setSelectClubAction(action)
    }
    
    func setSelectDateAction(_ action: @escaping EmptyClosure) {
        topContainer.setSelectDateAction(action)
    }
    
    func setSelectTimeAction(_ action: @escaping EmptyClosure) {
        topContainer.setSelectTimeAction(action)
    }
    
    func setExtendedSearchQuestionMarkAction(
        _ action: @escaping EmptyClosure
    ) {
        topContainer.setExtendedSearchQuestionMarkAction(action)
    }
    
    func setExtendedSearchSelectionAction(
        _ action: @escaping EmptyClosure
    ) {
        topContainer.setExtendedSearchSelectionAction(action)
    }
    
    func updateSelectClubView(with adress: String) {
        topContainer.updateSelectClubView(with: adress)
    }
    
    func updateSelectDateView(with selectedDay: String) {
        topContainer.updateSelectDateView(with: selectedDay)
    }
    
    func updateSelectTimeView(with selectedTime: String) {
        topContainer.updateSelectTimeView(with: selectedTime)
    }
    
    func updateStateClubView(with state: SelectedView.ViewState) {
        topContainer.updateStateClubView(with: state)
    }
    
    func updateStateDateView(with state: SelectedView.ViewState) {
        topContainer.updateStateDateView(with: state)
    }
    
    func updateStateTimeView(with state: SelectedView.ViewState) {
        topContainer.updateStateTimeView(with: state)
    }
    
    func updateExtendedSearchView(with state: ExtendedSearchView.State) {
        topContainer.updateExtendedSearchView(with: state)
    }

    // MARK: - MidContainer
    func setPCRoomTapAction(action: @escaping StringClosure) {
        midContainer.setPCRoomTapAction(action: action)
    }
    
    func updateRoomLoaderIndicator(isLoading: Bool) {
        midContainer.updateRoomLoaderIndicator(isLoading: isLoading)
    }
    
    func updateGameRooms(with rooms: GameRooms) {
        midContainer.updateGameRooms(with: rooms)
    }
    
    func selectedComputer(with pcName: String) {
        midContainer.selectedComputer(with: pcName)
    }
    
    func updateStatePCView(with state: SelectedView.ViewState) {
        midContainer.updateStatePCView(with: state)
    }

    // MARK: - BottomContainer
    func setReserveButtonAction(_ action: @escaping EmptyClosure) {
        bottomContainer.setReserveButtonAction(action)
    }
    
    func setAllPriceButtonAction(_ action: @escaping EmptyClosure) {
        bottomContainer.setAllPriceButtonAction(action)
    }
    
    func setVisibleMyReserveButton(isVisible: Bool) {
        bottomContainer.setVisibleMyReserveButton(isVisible: isVisible)
    }
    
    func setMyReservationButtonAction(_ action: @escaping EmptyClosure) {
        bottomContainer.setMyReservationButtonAction(action)
    }
    
    func updateButton(
        with description: String?,
        title: String?,
        state: ReservationButtonState
    ) {
        bottomContainer.updateButton(with: description, title: title, state: state)
    }
    
    // MARK: - Private
    private func setupAppearance() {
        backgroundColor = Color.background()
        
        scrollView.isUserInteractionEnabled = true
        scrollView.backgroundColor = Color.background()
        scrollView.isScrollEnabled = true
        scrollView.showsVerticalScrollIndicator = false
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.contentInset.top = 68.scale()
        scrollView.contentInsetAdjustmentBehavior = .never
        scrollView.alwaysBounceVertical = false
        scrollView.alwaysBounceHorizontal = false
        
        addSubview(scrollView)
        scrollView.snp.makeConstraints {
            $0.edges.size.equalToSuperview()
        }
        
        scrollView.addSubview(topContainer)
        topContainer.snp.makeConstraints {
            $0.top.equalTo(scrollView.contentLayoutGuide)
            $0.horizontalEdges.equalTo(scrollView.frameLayoutGuide).inset(24.scale())
        }
        
        scrollView.addSubview(midContainer)
        midContainer.snp.makeConstraints {
            $0.top.equalTo(topContainer.snp.bottom).offset(24.scale())
            $0.horizontalEdges.equalTo(scrollView.frameLayoutGuide)
            $0.bottom.lessThanOrEqualTo(scrollView.frameLayoutGuide)
        }
        
        addSubview(bottomContainer)
        bottomContainer.snp.makeConstraints {
            $0.horizontalEdges.equalToSuperview()
            $0.bottom.equalToSuperview().inset(
                UIView.safeAreaBottom + tabBarHeight
            )
        }
    }
}
