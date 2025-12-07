
import AppError from "../../errorHelpers/AppError";
import QueryBuilder from "../../utils/QueryBuilder_chat";
import { ITourListing, TourListing, tourListingSortableFields } from "./listing.model";

export const ListingService = {
    createListing: async (payload: ITourListing) => {
        return await TourListing.create(payload);
    },

    getListings: async (query: Record<string, string>) => {
        // console.log('getListings query', query);
        const qb = new QueryBuilder(TourListing.find({ isActive: true }), query);

        const listings = await qb.search(tourListingSortableFields)
            .filter()
            .sort()
            .fields()
            .paginate();

        const [data, meta] = await Promise.all([listings.build(), qb.getMeta()]);

        return { data, meta };
    },

    getListingById: async (id: string) => {
        const listing = await TourListing.findById(id).populate('guideId','-password');

        if (!listing) {
            throw new AppError(404, 'Listing not found');
        }

        return listing;
    },

    updateListing: async (id: string, payload: Record<string, string>) => {
        const listing = await TourListing.findByIdAndUpdate(id, payload, { new: true });
        if (!listing) {
            throw new AppError(404, 'Listing not found');
        }
        return listing;
    },

    deleteListing: async (id: string) => {
        const listing = await TourListing.findByIdAndUpdate(id, { isActive: false }, { new: true });
        if (!listing) {
            throw new AppError(404, 'Listing not found');
        }
        return listing;
    },
};
