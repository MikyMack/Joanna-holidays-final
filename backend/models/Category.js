const mongoose = require('mongoose');
const slugify = require('slugify'); 


const SubcategorySchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true
    },
    imageUrl: { 
        type: String, 
        required: false
    },
    isActive: { 
        type: Boolean, 
        default: true 
    }
}, { _id: true }); 


SubcategorySchema.pre('validate', function(next) {
    if (this.isModified('name') || !this.slug) {
    
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});

const CategorySchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true
    },
    slug: { 
        type: String, 
        required: true, 
        unique: true 
    },
    imageUrl: { 
        type: String, 
        required: true
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    subCategories: [SubcategorySchema] 
}, { 
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});


CategorySchema.pre('validate', async function(next) {
    if (this.isModified('name') || !this.slug) {
        let baseSlug = slugify(this.name, { lower: true, strict: true });
        let slug = baseSlug;
        let count = 1;
       
        while (
            await mongoose.models.Category.findOne({ slug, _id: { $ne: this._id } })
        ) {
            slug = `${baseSlug}-${count++}`;
        }
        this.slug = slug;
    }

    if (this.subCategories && Array.isArray(this.subCategories)) {
        for (let sub of this.subCategories) {
            if (!sub.slug || (sub.isModified && sub.isModified('name'))) {
                sub.slug = slugify(sub.name, { lower: true, strict: true });
            }
        }
    }

    next();
});


CategorySchema.statics.findBySubcategoryId = async function(subcategoryId) {
    return this.findOne({ 'subCategories._id': subcategoryId });
};


CategorySchema.virtual('activeSubCategories').get(function() {
    return this.subCategories.filter(sub => sub.isActive);
});


CategorySchema.index({ 'subCategories._id': 1 });
CategorySchema.index({ slug: 1 });
CategorySchema.index({ 'subCategories.slug': 1 });

module.exports = mongoose.model('Category', CategorySchema);