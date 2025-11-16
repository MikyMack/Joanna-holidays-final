const mongoose = require('mongoose');
const slugify = require('slugify');

const PackageSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    destination: { type: String, required: true },
    category: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category', 
        required: true 
    },
    subCategory: { 
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        validate: {
            validator: async function(value) {
                if (!value) return true;
                const category = await mongoose.model('Category').findOne({
                    _id: this.category,
                    'subCategories._id': value
                });
                return !!category;
            },
            message: 'Subcategory does not belong to the selected category'
        }
    },
    duration: { type: String, required: true },
    tourType: { type: String, required: true },
    groupSize: { type: Number, required: true },
    tourGuide: { type: String, required: true },
    packageDescription: { type: String, required: true },
    packagePrice: { type: Number, required: false },
    included: [{ type: String, required: true }],
    travelPlan: [{
        day: { type: String, required: true },
        description: { type: String, required: true }
    }],
    locationHref: { type: String, required: true },
    images: [{ 
        type: String, 
        required: true, 
    }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });


PackageSchema.pre('validate', async function (next) {
    if (this.isModified('title') || !this.slug) {

        let baseSlug = slugify(this.title, { lower: true, strict: true });
        let slug = baseSlug;

        let count = 1;
        while (await mongoose.models.Package.findOne({ slug, _id: { $ne: this._id } })) {
            slug = `${baseSlug}-${count++}`;
        }
        this.slug = slug;
    }
    next();
});

PackageSchema.index({ category: 1, subCategory: 1, isActive: 1 });
PackageSchema.index({ packagePrice: 1 });

module.exports = mongoose.model('Package', PackageSchema);