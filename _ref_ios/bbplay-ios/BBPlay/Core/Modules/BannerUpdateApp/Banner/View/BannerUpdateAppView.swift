import Foundation
import UIKit
import SnapKit

final class BannerUpdateAppView: UIView {
    private let contentContainer = UIView()
    
    private let newVersionImageView = UIImageView(
        image: Image.banner_update_new_version()
    )
    private let logoImageView = UIImageView(
        image: Image.banner_update_logo()
    )
    
    private let textContainer = UIView()
    private let titleLabel = UILabel()
    private let subtitleLabel = UILabel()

    private let button = MainButton()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupAppearance()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }

    func setButtonAction(_ action: @escaping EmptyClosure) {
        button.setActionButton(action)
    }

    private func setupAppearance() {
        backgroundColor = .black
        contentContainer.backgroundColor = Color.background()
        
        addSubview(contentContainer)
        contentContainer.snp.makeConstraints {
            $0.centerY.equalToSuperview()
            $0.horizontalEdges.equalToSuperview()
        }

        contentContainer.addSubview(newVersionImageView)
        newVersionImageView.snp.makeConstraints {
            $0.top.equalToSuperview().inset(49.scale())
            $0.right.equalToSuperview().inset(32.scale())
            $0.height.equalTo(31.scale())
            $0.width.equalTo(130.scale())
        }

        contentContainer.addSubview(logoImageView)
        logoImageView.snp.makeConstraints {
            $0.top.equalTo(newVersionImageView.snp.bottom)
            $0.left.equalToSuperview().inset(63.scale())
            $0.height.equalTo(89.scale())
            $0.width.equalTo(229.scale())
        }

        contentContainer.addSubview(textContainer)
        textContainer.snp.makeConstraints {
            $0.top.equalTo(logoImageView.snp.bottom).offset(36.scale())
            $0.horizontalEdges.equalToSuperview().inset(24.scale())
        }

        let titleParagraphStyle = NSMutableParagraphStyle()
        titleParagraphStyle.lineBreakMode = .byTruncatingTail
        titleParagraphStyle.alignment = .center
        titleParagraphStyle.minimumLineHeight = 28.scale()
        titleParagraphStyle.maximumLineHeight = 28.scale()
        let titleString = NSMutableAttributedString(
            string: Localizable.bannerUpdateTitle(),
            attributes: [
                .paragraphStyle: titleParagraphStyle,
                .foregroundColor: UIColor.white,
                .font: Font.dinRoundProBold(size: 28.scale())!
        ])
        titleLabel.attributedText = titleString
        titleLabel.numberOfLines = 1
        textContainer.addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.top.equalToSuperview()
            $0.horizontalEdges.equalToSuperview()
            $0.height.equalTo(28.scale())
        }

        let subtitleParagraphStyle = NSMutableParagraphStyle()
        subtitleParagraphStyle.lineBreakMode = .byTruncatingTail
        subtitleParagraphStyle.alignment = .center
        subtitleParagraphStyle.minimumLineHeight = 20.scale()
        subtitleParagraphStyle.maximumLineHeight = 20.scale()
        let subtitleString = NSMutableAttributedString(
            string: Localizable.bannerUpdateSubtitle(),
            attributes: [
                .paragraphStyle: titleParagraphStyle,
                .foregroundColor: Color.commonText()!,
                .font: Font.dinRoundProMedi(size: 20.scale())!
            ])
        subtitleLabel.attributedText = subtitleString
        subtitleLabel.numberOfLines = 2
        textContainer.addSubview(subtitleLabel)
        subtitleLabel.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom).offset(16.scale())
            $0.horizontalEdges.equalToSuperview()
            $0.bottom.equalToSuperview()
        }

        button.configure(title: Localizable.bannerUpdateButtonTitle())
        button.setEnable(isEnabled: true)
        contentContainer.addSubview(button)
        button.snp.makeConstraints {
            $0.top.equalTo(textContainer.snp.bottom).offset(113.scale())
            $0.horizontalEdges.equalToSuperview().inset(24.scale())
            $0.bottom.equalToSuperview().inset(24.scale())
            $0.height.equalTo(58.scale())
        }
    }
}
