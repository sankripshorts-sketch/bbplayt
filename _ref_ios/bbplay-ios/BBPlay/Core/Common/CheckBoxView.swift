import Foundation
import SnapKit

final class CheckBoxView: UIView {
    enum State {
        case active
        case inactive
        case unavailable
    }

    var currentState: State = .inactive {
        didSet {
            changeBackgroundColor(by: currentState)
        }
    }
    
    private let centerCircleView = UIView()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }
}

// MARK: - Private extension -
private extension CheckBoxView {
    func setupUI() {
        setupCenterCircleView()
        changeBackgroundColor(by: .unavailable)
    }

    func setupCenterCircleView() {
        centerCircleView.backgroundColor = .white
        centerCircleView.layer.cornerRadius = 10
        
        addSubview(centerCircleView)
        centerCircleView.snp.makeConstraints {
            $0.edges.equalToSuperview().inset(6.scale())
        }
    }

    func changeBackgroundColor(by state: State) {
        switch currentState {
            case .active:
                backgroundColor = .green
                centerCircleView.backgroundColor = .white
            case .inactive:
                backgroundColor = .gray
                centerCircleView.backgroundColor = .white
            case .unavailable:
                backgroundColor = .gray
                centerCircleView.backgroundColor = R.color.commonText()
        }
    }
}

// MARK: - Public -
extension CheckBoxView {
    func update(state: State) {
        currentState = state
    }
}
