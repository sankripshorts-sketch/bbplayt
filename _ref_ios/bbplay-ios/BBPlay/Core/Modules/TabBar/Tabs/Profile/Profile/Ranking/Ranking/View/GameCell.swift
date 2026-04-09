import Foundation
import SnapKit

final class GameCell: BaseCollectionCell {
    
    var type: GameType?
        
    private let backgroundGame = UIImageView()
    private let gameLabel = UILabel()
    
    private let liderBoardStackView = UIStackView()
    private let firstPlaceLabel = UILabel()
    private let secondPlaceLabel = UILabel()
    private let thirdPlaceLabel = UILabel()

    override func setupUI() {
        contentView.layer.shadowColor = UIColor.black.cgColor
        contentView.layer.shadowOffset = CGSize(width: 0, height: 4.scale())
        contentView.layer.shadowRadius = 12
        contentView.layer.shadowOpacity = 0.16
        contentView.layer.shadowPath = UIBezierPath(roundedRect: self.bounds, cornerRadius: 8).cgPath
        
        setupBackground()
        setupGameLabel()
        
        setupLiderboardStackView()
        setupFirstPlaceLabel()
        setupSecondPlaceLabel()
        setupThirdPlaceLabel()
    }
    
    private func setupBackground() {
        contentView.addSubview(backgroundGame)
        
        backgroundGame.snp.makeConstraints {
            $0.edges.equalToSuperview()
        }
    }
    
    private func setupGameLabel() {
        gameLabel.font = Font.dinRoundProBold(size: 20.scale())
        contentView.addSubview(gameLabel)
        
        gameLabel.snp.makeConstraints {
            $0.bottom.equalTo(backgroundGame.snp.bottom).inset(16.scale())
            $0.left.equalTo(backgroundGame.snp.left).inset(16.scale())
            $0.height.equalTo(26.scale())
        }
    }

    private func setupLiderboardStackView() {
        liderBoardStackView.axis = .vertical
        liderBoardStackView.spacing = 4
        liderBoardStackView.distribution = .fillEqually
        contentView.addSubview(liderBoardStackView)

        liderBoardStackView.snp.makeConstraints {
            $0.bottom.equalTo(backgroundGame.snp.bottom).inset(16.scale())
            $0.right.equalTo(backgroundGame.snp.right).inset(16.scale())
            $0.height.equalTo(56.scale())
        }
    }
    
    private func setupFirstPlaceLabel() {
        firstPlaceLabel.font = Font.dinRoundProBold(size: 14.scale())
        firstPlaceLabel.textColor = .white
        firstPlaceLabel.adjustsFontSizeToFitWidth = true
        liderBoardStackView.addArrangedSubview(firstPlaceLabel)
    }
    
    private func setupSecondPlaceLabel() {
        secondPlaceLabel.font = Font.dinRoundProBold(size: 14.scale())
        secondPlaceLabel.textColor = .white
        secondPlaceLabel.adjustsFontSizeToFitWidth = true
        liderBoardStackView.addArrangedSubview(secondPlaceLabel)
    }
    
    private func setupThirdPlaceLabel() {
        thirdPlaceLabel.font = Font.dinRoundProBold(size: 14.scale())
        thirdPlaceLabel.textColor = .white
        thirdPlaceLabel.adjustsFontSizeToFitWidth = true
        liderBoardStackView.addArrangedSubview(thirdPlaceLabel)
    }

    func update(with game: Game) {
        type = game.gameType
        backgroundGame.image = game.gameType.image
        gameLabel.text = game.gameTitle
        firstPlaceLabel.text = getPlaceText(with: game.ranks[0])
        secondPlaceLabel.text = getPlaceText(with: game.ranks[1])
        thirdPlaceLabel.text = getPlaceText(with: game.ranks[2])
    }

    private func getPlaceText(with rank: Rank) -> String {
        guard !rank.playerName.isEmpty else {
            return ""
        }
    
        let playerName = rank.playerName
        let place = rank.rank

        return "\(place). \(playerName)"
    }
}
