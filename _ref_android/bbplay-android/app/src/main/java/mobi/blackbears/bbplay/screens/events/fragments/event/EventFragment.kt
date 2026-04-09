package mobi.blackbears.bbplay.screens.events.fragments.event

import android.content.Context
import android.os.Bundle
import android.view.View
import androidx.core.view.isVisible
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.common.navigation.safeNavigate
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.FragmentEventBinding
import mobi.blackbears.bbplay.screens.events.di.DaggerEventComponent
import mobi.blackbears.bbplay.screens.events.fragments.event.adapter.EventListAdapter
import javax.inject.Inject

class EventFragment : BindingFragment<FragmentEventBinding>(FragmentEventBinding::inflate) {
    @Inject
    lateinit var factory: ViewModelFactory
    private val viewModel by viewModels<EventViewModel> { factory }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerEventComponent.factory().create(context.appComponent).inject(this)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setLoader()
        observeItems()
        binding.swipeRefreshEvents.setOnRefreshListener {
            viewModel.loadEvents()
            binding.swipeRefreshEvents.isRefreshing = false
        }
        viewModel.navCommand.observe(viewLifecycleOwner, observer = findNavController()::safeNavigate)
    }

    private fun setLoader() {
        viewModel.isLoaderVisible.observe(viewLifecycleOwner) {
            binding.progressBar.root.isVisible = it
        }
    }

    private fun observeItems() {
        val adapter = EventListAdapter(viewModel::navigateToEventDetailFragment)
        binding.rvEvents.adapter = adapter
        viewModel.eventItems.observe(viewLifecycleOwner, observer = adapter::submitList)
    }
}