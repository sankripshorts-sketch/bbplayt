package mobi.blackbears.bbplay.screens.clubs.presentation.adapter

import android.view.*
import androidx.recyclerview.widget.RecyclerView
import mobi.blackbears.bbplay.common.extensions.setBlockingClickListener
import mobi.blackbears.bbplay.common.fragment.adapter.Item
import mobi.blackbears.bbplay.databinding.*

class ClubViewHolder private constructor(
    private val binding: ItemClubInfoBinding
) : RecyclerView.ViewHolder(binding.root) {

    constructor(parent: ViewGroup) : this(
        ItemClubInfoBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    fun bind(
        item: Item,
        onAddressClick: (lat: Double, lng: Double) -> Unit,
        onPhoneClick: (phone: String) -> Unit,
        onWebSiteClick: (url: String) -> Unit
    ) {
        val clubItem = item as? ClubItem ?: return
        val phone = clubItem.clubInfo.license_phone
        val lat = clubItem.clubInfo.lat
        val lng = clubItem.clubInfo.lng
        val urlWebsite = clubItem.clubInfo.license_website

        with(binding) {
            ivClubDrawable.setImageResource(clubItem.drawableClub)
            tvAddressText.text = clubItem.clubInfo.license_address
            tvPhoneText.text = phone
            vkWebAddress.text = urlWebsite

            tvPhoneText.setBlockingClickListener { onPhoneClick.invoke(phone) }
            btnPhoneInfo.setBlockingClickListener { onPhoneClick.invoke(phone) }
            tvAddressText.setBlockingClickListener { onAddressClick.invoke(lat, lng) }
            btnLocationInfo.setBlockingClickListener { onAddressClick.invoke(lat, lng) }
            vkWebAddress.setBlockingClickListener { onWebSiteClick.invoke(urlWebsite) }
            btnToVk.setBlockingClickListener { onWebSiteClick.invoke(urlWebsite) }
        }
    }
}