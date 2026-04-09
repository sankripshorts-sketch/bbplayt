import Foundation
import UIKit
import SnapKit

final class ExtendedSearchView: UIView {
    enum State {
        case active
        case inactive
        case unavailable
    }

    private let checkBox = CheckBoxView()
    private let title = UILabel()
    private let questionMark = UIImageView(image: R.image.question_mark())
    
    private var questionMarkAction: EmptyClosure?
    private var selectionAction: EmptyClosure?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupAppearance()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }
    
    func setQuestionMarkAction(_ action: @escaping EmptyClosure) {
        questionMarkAction = action
    }

    func setSelectionAction(_ action: @escaping EmptyClosure) {
        selectionAction = action
    }

    func update(state: State) {
        switch state {
            case .active:
                checkBox.update(state: .active)
            case .inactive:
                checkBox.update(state: .inactive)
            case .unavailable:
                checkBox.update(state: .unavailable)
        }
    }

    private func setupAppearance() {
        let selfTapGestureRecognizer = UITapGestureRecognizer(
            target: self,
            action: #selector(selfTapped)
        )
        addGestureRecognizer(selfTapGestureRecognizer)
        isUserInteractionEnabled = true
        
        checkBox.isUserInteractionEnabled = false
        checkBox.layer.cornerRadius = 16
        addSubview(checkBox)
        checkBox.snp.makeConstraints {
            $0.verticalEdges.left.equalToSuperview()
            $0.size.equalTo(32.scale())
        }

        title.isUserInteractionEnabled = false
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.minimumLineHeight = 16.scale()
        paragraphStyle.maximumLineHeight = 16.scale()
        paragraphStyle.alignment = .left
        title.attributedText = NSAttributedString(
            string: Localizable.addTimeToExtendedSearch(),
            attributes: [
                .paragraphStyle: paragraphStyle,
                .foregroundColor: Color.commonText()!,
                .font: Font.dinRoundProBold(size: 16.scale())!,
            ]
        )
        title.numberOfLines = 2
        addSubview(title)
        title.snp.makeConstraints {
            $0.left.equalTo(checkBox.snp.right).offset(12.scale())
            $0.verticalEdges.equalToSuperview()
            $0.height.equalTo(32.scale())
        }

        let questionMarkTapGestureRecognizer = UITapGestureRecognizer(
            target: self,
            action: #selector(questionMarkTapped)
        )
        questionMark.isUserInteractionEnabled = true
        questionMark.addGestureRecognizer(questionMarkTapGestureRecognizer)
        addSubview(questionMark)
        questionMark.snp.makeConstraints {
            $0.centerY.equalToSuperview()
            $0.left.equalTo(title.snp.right).offset(12)
            $0.size.equalTo(16.scale())
        }
    }
    
    @objc func questionMarkTapped() {
        questionMarkAction?()
    }

    @objc func selfTapped() {
        selectionAction?()
    }
}
