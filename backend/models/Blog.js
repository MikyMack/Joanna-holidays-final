const mongoose = require('mongoose');
const slugify = require('slugify');

const BlogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    metaTitle: { type: String, required: true },
    metaDescription: { type: String, required: true },
    metaKeywords: { type: [String], required: true },
    content: { type: String, required: true },
    author: { type: String, required: true },
    imageUrl: { type: String, required: true },
    cloudinary_id: { type: String, required: true }
}, { timestamps: true });

BlogSchema.pre('validate', async function(next) {
    if (this.isModified('title') || !this.slug) {
        let baseSlug = slugify(this.title, { lower: true, strict: true });
        let slug = baseSlug;
        let count = 1;
        
        while (await mongoose.models.Blog.findOne({ slug, _id: { $ne: this._id } })) {
            slug = `${baseSlug}-${count++}`;
        }
        this.slug = slug;
    }
    next();
});

module.exports = mongoose.model('Blog', BlogSchema);