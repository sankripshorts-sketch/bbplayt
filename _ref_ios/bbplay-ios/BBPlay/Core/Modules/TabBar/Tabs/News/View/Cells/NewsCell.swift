import Foundation
import SnapKit

class NewsCell: BaseCollectionCell {
    var postId: Int?
    
    private var openLinkClosure = { }
    
    private let container = UIView()
    private let logo = UIImageView()
    private let title = UILabel()
    private let date = UILabel()
    private let newsText = UILabel()

    private let imagePost = UIImageView()
    private let containerPostButtons = UIStackView()
    
    private let commentsButton = NewsPostButton()
    private let imageButton = NewsPostButton()
    private let linkButton = NewsPostButton()
    private let pollButton = NewsPostButton()
    
    private let playIcon = UIImageView()
    
    private let border = CAGradientLayer()
    private let shape = CAShapeLayer()
    
    override func setupUI() {
        backgroundColor = Color.backgroundNewsCell()
        contentView.layer.cornerRadius = 8
        contentView.clipsToBounds = true
        
        setupContainer()
        setupLogo()
        setupTitle()
        setupDate()
        setupContainerForPostButton()
        setupNewsText()
        setupBorder()
        setupPostImage()
        setupPlayIcon()
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()

        border.frame = CGRect(origin: CGPoint.zero, size: self.frame.size)
        shape.path = UIBezierPath(roundedRect: self.bounds, cornerRadius: contentView.layer.cornerRadius).cgPath
    }
    
    override func prepareForReuse() {
        super.prepareForReuse()
        
        openLinkClosure = { }
        title.text = nil
        date.text = nil
        newsText.text = nil
        imagePost.image = nil
        containerPostButtons.arrangedSubviews.forEach { $0.removeFromSuperview() }
        
        imagePost.snp.removeConstraints()
        playIcon.snp.removeConstraints()
        newsText.snp.makeConstraints {
            $0.top.equalTo(date.snp.bottom).offset(12.scaleIfNeeded())
            $0.left.right.equalToSuperview().inset(16.scaleIfNeeded())
            $0.bottom.equalTo(containerPostButtons.snp.top).inset(-16.scaleIfNeeded())
        }
        
        playIcon.removeFromSuperview()
        setupPlayIcon()
        playIcon.frame = .zero
    }
    
    private func setupContainer() {
        addSubview(container)
        
        container.snp.makeConstraints {
            $0.edges.equalToSuperview()
            $0.width.equalTo(327.scaleIfNeeded())
        }
    }
    
    private func setupLogo() {
        logo.image = Image.newsFeedClubLogo()
        container.addSubview(logo)
        
        logo.snp.makeConstraints {
            $0.top.equalToSuperview().inset(16.scaleIfNeeded())
            $0.left.equalToSuperview().inset(16.scaleIfNeeded())
            $0.size.equalTo(36.scaleIfNeeded())
        }
    }
    
    private func setupTitle() {
        title.font = Font.dinRoundProBold(size: 16.scaleIfNeeded())
        title.textColor = .white
        title.numberOfLines = 2
        container.addSubview(title)
        
        title.snp.makeConstraints {
            $0.top.equalToSuperview().inset(16.scaleIfNeeded())
            $0.left.equalTo(logo.snp.right).offset(8.scaleIfNeeded())
            $0.right.equalToSuperview().inset(16.scaleIfNeeded())
        }
    }
    
    private func setupDate() {
        date.font = Font.dinRoundProBold(size: 12.scaleIfNeeded())
        date.textColor = Color.inactiveIconTextField()
        container.addSubview(date)
        
        date.snp.makeConstraints {
            $0.top.equalTo(title.snp.bottom)
            $0.left.equalTo(logo.snp.right).offset(8.scaleIfNeeded())
            $0.right.equalToSuperview().inset(16.scaleIfNeeded())
        }
    }
    
    private func setupNewsText() {
        newsText.font = Font.dinRoundProMedi(size: 14.scaleIfNeeded())
        newsText.textColor = .white
        newsText.lineBreakMode = .byWordWrapping
        newsText.numberOfLines = 0
        container.addSubview(newsText)
        
        newsText.snp.makeConstraints {
            $0.top.equalTo(date.snp.bottom).offset(12.scaleIfNeeded())
            $0.left.right.equalToSuperview().inset(16.scaleIfNeeded())
            $0.bottom.equalTo(containerPostButtons.snp.top).inset(-16.scaleIfNeeded())
        }
    }
    
    private func setupBorder() {
        border.colors = [Color.newsCellBorder()!.withAlphaComponent(0).cgColor,
                         Color.newsCellBorder()!.withAlphaComponent(1).cgColor]
        border.cornerRadius = 8
        
        shape.lineWidth = 2.scaleIfNeeded()
        shape.strokeColor = UIColor.white.cgColor
        shape.fillColor = UIColor.clear.cgColor
        border.mask = shape

        contentView.layer.addSublayer(border)
    }
    
    private func setupContainerForPostButton() {
        containerPostButtons.alignment = .fill
        containerPostButtons.distribution = .fillEqually
        containerPostButtons.spacing = 9.scaleIfNeeded()
        
        container.addSubview(containerPostButtons)
        containerPostButtons.snp.makeConstraints {
            $0.height.equalTo(36.scaleIfNeeded())
            $0.left.right.bottom.equalToSuperview().inset(16.scaleIfNeeded())
        }
    }
    
    private func setupPostImage() {
        container.addSubview(imagePost)
    }
    
    private func updateText(with newsPost: NewsPost) -> String {
        var mainText = ""
        
        if !newsPost.mainText.isEmpty {
            mainText += newsPost.mainText
        }
        
        if !newsPost.repostText.isEmpty {
            mainText += newsPost.repostText
        }
        
        if let video = newsPost.videos {
            video.forEach { videoInPost in
                mainText += "\n\(videoInPost.titleVideo)\n\(videoInPost.descriptionVideo)"
            }
        }

        if let link = newsPost.links {
            link.forEach { linkInPost in
                mainText += "\n\(linkInPost.titleLink)\n\(linkInPost.descriptionLink)"
            }
        }

        return mainText
    }
    
    private func openLink(with link: URL?) {
        guard let url = link else {
            logger.error("\(self) vk url missing")
            assertionFailure()
            return
        }
        UIApplication.shared.open(url, options: [:], completionHandler: nil)
    }
    
    @objc func openLinkTap() {
        openLinkClosure()
    }
    
    private func setupPlayIcon() {
        playIcon.image = Image.newsPlayIcon()
        imagePost.addSubview(playIcon)
    }
}

extension NewsCell {
    func update(with newsPost: NewsPost) {
        postId = newsPost.postId
        title.text = Localizable.newsNameClub()
        date.text = newsPost.date
        newsText.text = updateText(with: newsPost)
        
        openLinkClosure = { [weak self] in
            self?.openLink(with: newsPost.links?.first?.link)
        }
        
        commentsButton.update(with: .comment, and: newsPost.commentsCount)
        containerPostButtons.addArrangedSubview(commentsButton)
        
        if newsPost.config.haveImage {
            imagePost.image = newsPost.imageСontent?.propertiImage?.image
            
            imagePost.snp.makeConstraints {
                $0.top.equalTo(newsText.snp.bottom).offset(12.scaleIfNeeded())
                $0.left.right.equalToSuperview()
                $0.height.equalTo(newsPost.imageСontent?.propertiImage?.height ?? 0)
                $0.bottom.equalTo(containerPostButtons.snp.top).inset(-16.scaleIfNeeded())
            }
            
            newsText.snp.remakeConstraints {
                $0.top.equalTo(date.snp.bottom).offset(12.scaleIfNeeded())
                $0.left.right.equalToSuperview().inset(16.scaleIfNeeded())
            }
            
            if !containerPostButtons.arrangedSubviews.contains(where: { $0 == imageButton }),
               let counts = newsPost.imageСontent?.countImages, counts > 1 {
                imageButton.update(with: .photo, and: counts)
                containerPostButtons.addArrangedSubview(imageButton)
            }
        }
        
        if newsPost.type.contains(where: { $0 == .video }) {
            playIcon.snp.makeConstraints {
                $0.center.equalTo(imagePost.snp.center)
                $0.size.equalTo(48.scale())
            }
        } else { playIcon.removeFromSuperview() }
        
        if newsPost.config.haveLink {
            if !containerPostButtons.arrangedSubviews.contains(where: { $0 == linkButton }) {
                linkButton.update(with: .link)
                containerPostButtons.addArrangedSubview(linkButton)
                let tap = UITapGestureRecognizer(target: self, action: #selector(openLinkTap))
                linkButton.addGestureRecognizer(tap)
            }
        }
        
        if newsPost.config.havePoll {
            if !containerPostButtons.arrangedSubviews.contains(where: { $0 == pollButton }) {
                pollButton.update(with: .poll)
                containerPostButtons.addArrangedSubview(pollButton)
            }
        }
    }
}
