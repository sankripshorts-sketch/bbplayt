import Foundation

final class TabBarPreseterImpl {
    
    private weak var view: TabBarView?
    private let tabBarModelBuilder: TabBarBuilder
    
    
    init(tabBarModelBuilder: TabBarBuilder) {
        self.tabBarModelBuilder = tabBarModelBuilder
    }
    
    func setView(_ view: TabBarView) {
        self.view = view
    }
}

extension TabBarPreseterImpl: TabBarPresenter {
    func setupTabModels(_ tabModels: [TabModel]) {
        let viewControllers = tabBarModelBuilder.prepareViewControllers(tabModels: tabModels)
        view?.set(viewControllers: viewControllers)
    }
}
