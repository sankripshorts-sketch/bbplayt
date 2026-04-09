import UIKit

class BaseNavigationController: UINavigationController {
    override func viewDidLoad() {
        super.viewDidLoad()

        overrideUserInterfaceStyle = .dark
        navigationBar.isHidden = true

        setupNavigationBar()
    }
    
    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
        navigationBar.topItem?.backButtonDisplayMode = .minimal
        visibleTabBarIfNeeded()
    }
    
    private func setupNavigationBar() {
        let insets = UIEdgeInsets(top: 0, left: 15.scale(), bottom: 2.scale(), right: 0)
        let image = Image.navBarBackButton()!.withInsets(insets)?.withRenderingMode(.alwaysOriginal)

        navigationItem.hidesBackButton = true
        
        let appearance = UINavigationBarAppearance()
        appearance.backgroundEffect = nil
        appearance.shadowColor = nil
        appearance.setBackIndicatorImage(image, transitionMaskImage: image)

        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
    }
}
