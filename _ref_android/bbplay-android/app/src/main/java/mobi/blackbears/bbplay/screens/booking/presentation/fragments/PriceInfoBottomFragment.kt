package mobi.blackbears.bbplay.screens.booking.presentation.fragments

import android.content.Context
import android.os.Bundle
import android.view.View
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.fragment.BindingBottomFragment
import mobi.blackbears.bbplay.databinding.BottomFragmentPricesBinding
import mobi.blackbears.bbplay.screens.booking.presentation.adapter.PriceInfoAdapter
import mobi.blackbears.bbplay.screens.booking.di.DaggerBookingComponent

import javax.inject.Inject

class PriceInfoBottomFragment :
    BindingBottomFragment<BottomFragmentPricesBinding>(BottomFragmentPricesBinding::inflate) {

    private val viewModel: BookingViewModel by viewModels({ parentFragmentManager.fragments[0] })

    @Inject
    lateinit var adapter: PriceInfoAdapter

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerBookingComponent.factory().create(context.appComponent).inject(this)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.recyclerForPrises.adapter = adapter

        viewModel.priceInfo.observe(viewLifecycleOwner) { list ->
            adapter.submitList(list)
        }
        viewModel.clubsInfo.observe(viewLifecycleOwner) {
            binding.tvAddressPrises.text = it.address
        }

        binding.btOkPrises.setOnClickListener {
            findNavController().navigateUp()
        }
    }
}