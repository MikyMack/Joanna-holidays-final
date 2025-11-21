const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const slugify = require('slugify');
const Category = require('../models/Category');
const Package = require('../models/Package');
const Gallery = require('../models/Gallery');
const Banner = require('../models/Banner');
const Blog = require('../models/Blog');
const Testimonial = require('../models/Testimonial');
const Video = require('../models/Video');
const MainBanner = require('../models/MainBanner');

router.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = 'https://www.joannaholidays.com';
        
        const [categories, packages, blogs] = await Promise.all([
            Category.find({ isActive: true }).lean(),
            Package.find({ isActive: true }).lean(),
            Blog.find().lean()
        ]);

        let urls = [
            { url: '/', changefreq: 'daily', priority: 1.0 },
            { url: '/about', changefreq: 'monthly', priority: 0.8 },
            { url: '/packages', changefreq: 'daily', priority: 0.9 },
            { url: '/blogs', changefreq: 'weekly', priority: 0.8 },
            { url: '/gallery', changefreq: 'monthly', priority: 0.7 },
            { url: '/contact', changefreq: 'yearly', priority: 0.6 },
            { url: '/customTours', changefreq: 'yearly', priority: 0.6 }
        ];

        categories.forEach(cat => {
            urls.push({ url: `/packages/${cat.slug}`, changefreq: 'weekly', priority: 0.8 });
            
            if (cat.subCategories) {
                cat.subCategories.forEach(sub => {
                    if (sub.isActive) {
                        urls.push({ url: `/packages/${cat.slug}/${sub.slug}`, changefreq: 'weekly', priority: 0.8 });
                    }
                });
            }
        });

        packages.forEach(pkg => {
            urls.push({ url: `/package/${pkg.slug}`, changefreq: 'weekly', priority: 0.9 });
        });

        blogs.forEach(blog => {
            if (blog.slug) {
                urls.push({ url: `/blogs/${blog.slug}`, changefreq: 'monthly', priority: 0.7 });
            }
        });

        let xml = '<?xml version="1.0" encoding="UTF-8"?>';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        
        urls.forEach(u => {
            xml += '<url>';
            xml += `<loc>${baseUrl}${u.url}</loc>`;
            xml += `<changefreq>${u.changefreq}</changefreq>`;
            xml += `<priority>${u.priority}</priority>`;
            xml += '</url>';
        });

        xml += '</urlset>';

        res.header('Content-Type', 'application/xml');
        res.send(xml);

    } catch (error) {
        res.status(500).send('Error generating sitemap');
    }
});

router.get('/', async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true }).sort({ createdAt: -1 });
        const mainbanners = await MainBanner.find({ isActive: true }).sort({ createdAt: -1 });
        const categories = await Category.find({ isActive: true })
            .select('name slug imageUrl subCategories.name subCategories.slug subCategories.isActive')
            .lean();

        const fixedDepartureCategoryId = '6848056f80e92de2c956def0';

        const packages = await Package.find({ isActive: true })
            .populate({ path: 'category', select: 'name slug imageUrl' })
            .populate({ path: 'subCategory', select: 'name slug imageUrl', match: { isActive: true } })
            .lean();

        const fixedDeparturePackages = packages.filter(pkg =>
            pkg.category && pkg.category._id && pkg.category._id.toString() === fixedDepartureCategoryId
        );

        const blogs = await Blog.find().sort({ createdAt: -1 }).limit(3);
        
        // Auto-fix missing slugs for old blogs
        for (const blog of blogs) {
            if (!blog.slug) {
                blog.slug = slugify(blog.title, { lower: true, strict: true });
                // Update database directly
                await Blog.updateOne({ _id: blog._id }, { $set: { slug: blog.slug } });
            }
        }

        const testimonials = await Testimonial.find().sort({ createdAt: -1 }).limit(10);
        const videos = await Video.find().sort({ createdAt: -1 }).limit(3);

        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg =>
                pkg.category?._id.toString() === category._id.toString()
            );
            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);
            return {
                _id: category._id,
                name: category.name,
                slug: category.slug,
                imageUrl: category.imageUrl,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages: directPackages,
                locationCount: categoryPackages.length 
            };
        });

        const processedPackages = packages.map(pkg => ({
            ...pkg,
            categoryName: pkg.category?.name || 'Deleted Category',
            categoryImage: pkg.category?.imageUrl || '',
            subCategoryName: pkg.subCategory?.name || null,
            subCategoryImage: pkg.subCategory?.imageUrl || null,
            shortDescription: pkg.packageDescription
                ? pkg.packageDescription.split(' ').slice(0, 20).join(' ') + (pkg.packageDescription.split(' ').length > 20 ? '...' : '')
                : ''
        }));

        const processedFixedDeparturePackages = fixedDeparturePackages.map(pkg => ({
            ...pkg,
            categoryName: pkg.category?.name || 'Deleted Category',
            categoryImage: pkg.category?.imageUrl || '',
            subCategoryName: pkg.subCategory?.name || null,
            subCategoryImage: pkg.subCategory?.imageUrl || null,
            shortDescription: pkg.packageDescription
                ? pkg.packageDescription.split(' ').slice(0, 20).join(' ') + (pkg.packageDescription.split(' ').length > 20 ? '...' : '')
                : ''
        }));

        res.render('index', {
            title: 'Home Page',
            banners,
            mainbanners,
            categories: categoryMap,
            packages: processedPackages,
            fixedDeparturePackages: processedFixedDeparturePackages,
            featuredPackages: processedPackages.slice(0, 3),
            blogs,
            testimonials,
            videos,
            discount: Math.random() > 0.9 ? Math.floor(Math.random() * 15) + 10 : 0,
            query: req.query
        });
    } catch (error) {
        res.status(500).send('Error loading home page data');
    }
});

router.get('/about', async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true })
            .select('name slug imageUrl subCategories.name subCategories.slug subCategories.isActive')
            .lean();
        const blogs = await Blog.find().sort({ createdAt: -1 }).limit(3);
        
        // Auto-fix missing slugs
        for (const blog of blogs) {
            if (!blog.slug) {
                blog.slug = slugify(blog.title, { lower: true, strict: true });
                await Blog.updateOne({ _id: blog._id }, { $set: { slug: blog.slug } });
            }
        }

        const mainbanners = await MainBanner.find({ isActive: true }).sort({ createdAt: -1 });
        const gallery = await Gallery.find().sort({ createdAt: -1 }).limit(20);
        const testimonials = await Testimonial.find().sort({ createdAt: -1 }).limit(10);
        const packages = await Package.find({ isActive: true })
            .populate({ path: 'category', select: 'name imageUrl' })
            .populate({ path: 'subCategory', select: 'name imageUrl', match: { isActive: true } })
            .lean();
            
        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg => pkg.category?._id.toString() === category._id.toString());
            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);
            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages,
                locationCount: categoryPackages.length 
            };
        });
        res.render('about', { title: 'About Us', categories: categoryMap, blogs, gallery, testimonials, mainbanners });
    } catch (error) {
        res.status(500).send('Error loading about us page data');
    }
});

router.get('/blogs', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const blogs = await Blog.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
        
        // Auto-fix missing slugs
        for (const blog of blogs) {
            if (!blog.slug) {
                blog.slug = slugify(blog.title, { lower: true, strict: true });
                await blog.save(); // Using save on document instance
            }
        }

        const categories = await Category.find({ isActive: true })
            .select('name slug imageUrl subCategories.name subCategories.slug subCategories.isActive').lean();
        const packages = await Package.find({ isActive: true })
            .populate({ path: 'category', select: 'name imageUrl' })
            .populate({ path: 'subCategory', select: 'name imageUrl', match: { isActive: true } }).lean();
            
        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg => pkg.category?._id.toString() === category._id.toString());
            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);
            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages,
                locationCount: categoryPackages.length 
            };
        });
 
        const totalBlogs = await Blog.countDocuments();
        res.render('blogs', {
            title: 'Blogs',
            blogs,
            categories: categoryMap,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalBlogs / limit)
        });
    } catch (error) {
        res.status(500).send('Error loading blogs page data');
    }
});

router.get('/blogs/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        const blog = await Blog.findOne({ slug }).lean();

        if (!blog) {
            return res.status(404).send('Blog not found');
        }

        const categories = await Category.find({ isActive: true })
            .select('name slug imageUrl subCategories.name subCategories.slug subCategories.isActive')
            .lean();

        const relatedBlogs = await Blog.find({ _id: { $ne: blog._id } })
            .sort({ createdAt: -1 })
            .limit(3);
            
        // Auto-fix related blogs too
        for (const rBlog of relatedBlogs) {
            if (!rBlog.slug) {
                rBlog.slug = slugify(rBlog.title, { lower: true, strict: true });
                await rBlog.save();
            }
        }

        res.render('blogdetails', {
            title: blog.metaTitle || blog.title,
            blog: blog,
            relatedBlogs: relatedBlogs,
            categories
        });
    } catch (error) {
        res.status(500).send('Error loading blog details page data');
    }
});

router.get('/blogdetails', async (req, res) => {
    const { title } = req.query;
    if (title) {
        // Legacy support: Try to find by title and redirect to slug if found
        const blog = await Blog.findOne({ title }).select('slug').lean();
        if (blog && blog.slug) {
            return res.redirect(301, `/blogs/${blog.slug}`);
        }
        // Fallback: try to generate slug from title and see if it exists
        const slug = slugify(title, { lower: true, strict: true });
        const blogBySlug = await Blog.findOne({ slug }).lean();
        if(blogBySlug) {
             return res.redirect(301, `/blogs/${blogBySlug.slug}`);
        }
    }
    res.redirect(301, '/blogs');
});

router.get('/gallery', async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const galleryLimit = 10;
        const videoLimit = 9;
        const galleryPage = parseInt(page) || 1;
        const videoPage = parseInt(req.query.videoPage) || 1;
        const categories = await Category.find({ isActive: true })
            .select('name slug imageUrl subCategories.name subCategories.slug subCategories.isActive').lean();
        const packages = await Package.find({ isActive: true })
            .populate({ path: 'category', select: 'name imageUrl' })
            .populate({ path: 'subCategory', select: 'name imageUrl', match: { isActive: true } }).lean();

        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg => pkg.category?._id.toString() === category._id.toString());
            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);
            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages,
                locationCount: categoryPackages.length
            };
        });

        const totalGalleryItems = await Gallery.countDocuments();
        const gallery = await Gallery.find().skip((galleryPage - 1) * galleryLimit).limit(galleryLimit);
        const totalVideos = await Video.countDocuments();
        const videos = await Video.find().sort({ createdAt: -1 }).skip((videoPage - 1) * videoLimit).limit(videoLimit);

        res.render('gallery', {
            title: 'Gallery',
            categories: categoryMap,
            gallery,
            videos,
            currentPage: galleryPage,
            totalPages: Math.ceil(totalGalleryItems / galleryLimit),
            videoCurrentPage: videoPage,
            videoTotalPages: Math.ceil(totalVideos / videoLimit)
        });
    } catch (error) {
        res.status(500).send('Error loading gallery page data');
    }
});

router.get('/contact', async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true })
            .select('name slug imageUrl subCategories.name subCategories.slug subCategories.isActive').lean();
        const packages = await Package.find({ isActive: true })
            .populate({ path: 'category', select: 'name imageUrl' })
            .populate({ path: 'subCategory', select: 'name imageUrl', match: { isActive: true } }).lean();

        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg => pkg.category?._id.toString() === category._id.toString());
            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);
            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages,
                locationCount: categoryPackages.length
            };
        });

        res.render('contact', { title: 'Contact Us', categories: categoryMap });
    } catch (error) {
        res.status(500).send('Error loading contact page data');
    }
});

router.get('/packages/:categorySlug', async (req, res, next) => {
    try {
        const { categorySlug } = req.params;
        const category = await Category.findOne({ slug: categorySlug, isActive: true });
        
        if (!category) return next();

        req.query.category = categorySlug;
        return renderPackagesPage(req, res);
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

router.get('/packages/:categorySlug/:subCategorySlug', async (req, res) => {
    try {
        const { categorySlug, subCategorySlug } = req.params;
        const category = await Category.findOne(
            {
                slug: categorySlug,
                isActive: true,
                'subCategories': { $elemMatch: { slug: subCategorySlug, isActive: true } }
            },
            { name: 1, slug: 1, imageUrl: 1, subCategories: 1 }
        ).lean();

        if (!category) {
            return res.status(404).render('comming-soon', { message: 'Category or subcategory not found' });
        }

        const subCategoryData = category.subCategories.find(sub => sub.slug === subCategorySlug && sub.isActive);

        if (!subCategoryData) {
            return res.status(404).render('comming-soon', { message: 'Subcategory not found' });
        }

        const tourPackage = await Package.findOne({
            category: category._id,
            subCategory: subCategoryData._id,
            isActive: true
        }).populate('category', 'name slug').populate('subCategory', 'name slug');

        if (!tourPackage) {
            return res.status(404).render('comming-soon', { message: 'No packages found in this subcategory' });
        }

        let otherPackages = await Package.find({
            category: category._id,
            subCategory: subCategoryData._id,
            isActive: true,
            _id: { $ne: tourPackage._id }
        }).limit(3).populate('category', 'name slug').populate('subCategory', 'name slug').lean();

        if (otherPackages.length < 3) {
            const fillCount = 3 - otherPackages.length;
            const additionalPackages = await Package.find({
                _id: { $nin: [tourPackage._id, ...otherPackages.map(pkg => pkg._id)] },
                isActive: true,
            }).sort({ createdAt: -1 }).limit(fillCount).populate('category', 'name slug').populate('subCategory', 'name slug').lean();
            otherPackages = otherPackages.concat(additionalPackages);
        }

        const categoriesRaw = await Category.find({ isActive: true })
            .select('name slug imageUrl subCategories.name subCategories.slug subCategories.isActive').lean();
        const allPackages = await Package.find({ isActive: true })
            .populate({ path: 'category', select: 'name slug imageUrl' })
            .populate({ path: 'subCategory', select: 'name slug imageUrl', match: { isActive: true } }).lean();

        const categories = categoriesRaw.map(cat => {
            const categoryPackages = allPackages.filter(pkg => pkg.category?._id.toString() === cat._id.toString());
            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);
            return {
                ...category,
                subCategories: cat.subCategories.filter(s => s.isActive),
                directPackages,
                packages: categoryPackages,
                locationCount: categoryPackages.length
            };
        });

        res.render('packageDetails', {
            title: tourPackage.title || subCategoryData.name,
            tourPackage,
            subCategory: subCategoryData,
            parentCategory: { _id: category._id, name: category.name, slug: category.slug },
            categories,
            otherPackages
        });

    } catch (error) {
        res.status(500).send('Server Error');
    }
});

async function renderPackagesPage(req, res) {
    try {
        const { category: categorySlug, subCategory: subCategorySlug, search, minPrice, maxPrice, duration, tourType, month, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const queryObj = { isActive: true };

        const allCategories = await Category.find({ isActive: true })
            .select('name slug imageUrl subCategories.name subCategories.slug subCategories.isActive').lean();
 
        let selectedCategorySlugs = [];
        let categoryIdsToFilter = [];
        
        if (categorySlug) {
            const categorySlugsArr = Array.isArray(categorySlug) ? categorySlug : String(categorySlug).split(',').map(s => s.trim()).filter(Boolean);
            if (categorySlugsArr.length) {
                const matchedCategoryDocs = allCategories.filter(cat => categorySlugsArr.includes(cat.slug));
                const catIds = matchedCategoryDocs.map(cat => String(cat._id));
                if (catIds.length) {
                    queryObj.category = { $in: catIds };
                    categoryIdsToFilter = catIds;
                    selectedCategorySlugs = matchedCategoryDocs.map(cat => cat.slug);
                }
            }
        }

        let selectedSubCategorySlugs = [];
        if (subCategorySlug) {
            const subCatSlugsArr = Array.isArray(subCategorySlug) ? subCategorySlug : String(subCategorySlug).split(',').map(s => s.trim()).filter(Boolean);
            let allSubCats = [];
            if (categoryIdsToFilter.length > 0) {
                const filteredCats = allCategories.filter(cat => categoryIdsToFilter.includes(String(cat._id)));
                filteredCats.forEach(cat => {
                    (cat.subCategories || []).forEach(sub => { allSubCats.push({ ...sub, parentCategory: cat }); });
                });
            } else {
                allCategories.forEach(cat => {
                    (cat.subCategories || []).forEach(sub => { allSubCats.push({ ...sub, parentCategory: cat }); });
                });
            }
            const matchedSubCatIds = [];
            const matchedSubCatSlugs = [];
            subCatSlugsArr.forEach(slug => {
                const found = allSubCats.find(sc => sc.slug === slug && sc.isActive !== false);
                if (found) {
                    matchedSubCatIds.push(found._id);
                    matchedSubCatSlugs.push(found.slug);
                }
            });
            if (matchedSubCatIds.length) {
                queryObj.subCategory = { $in: matchedSubCatIds };
                selectedSubCategorySlugs = matchedSubCatSlugs;
            } else {
                if (subCatSlugsArr.length) queryObj.subCategory = { $in: [] };
            }
        }

        if (duration) queryObj.duration = duration;
        if (tourType) queryObj.tourType = tourType;
        if (month) queryObj.month = month;
        if (minPrice || maxPrice) {
            queryObj.packagePrice = {};
            if (minPrice) queryObj.packagePrice.$gte = +minPrice;
            if (maxPrice) queryObj.packagePrice.$lte = +maxPrice;
        }
   
        let searchRegex = null;
        if (search && String(search).length >= 3) searchRegex = new RegExp(search, 'i');
        let searchFilter = {};
        if (searchRegex) {
            searchFilter = { $or: [{ title: { $regex: searchRegex } }, { destination: { $regex: searchRegex } }, { packageDescription: { $regex: searchRegex } }] };
        }
        const finalQuery = Object.keys(searchFilter).length ? { $and: [queryObj, searchFilter] } : queryObj;
        const [totalPackages, packages, categoriesForList] = await Promise.all([
            Package.countDocuments(finalQuery),
            Package.find(finalQuery).populate({ path: 'category', select: 'name slug imageUrl' }).populate({ path: 'subCategory', select: 'name slug imageUrl' }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
            Category.find({ isActive: true }).select('name slug imageUrl subCategories.name subCategories.slug subCategories.isActive').lean().sort({ createdAt: -1 })
        ]);
   
        const uiCategories = categoriesForList.map(cat => ({ ...cat, subCategories: (cat.subCategories || []).filter(sub => sub.isActive) }));
        const pageCats = {};
        packages.forEach(pkg => {
            if (pkg.category && pkg.category.name) {
                pageCats[pkg.category.name] = pageCats[pkg.category.name] ? pageCats[pkg.category.name] + 1 : 1;
            }
        });

        res.render('packages', {
            title: 'Tour Packages',
            packages,
            categories: uiCategories.map(cat => ({ ...cat, packageCount: pageCats[cat.name] || 0 })),
            currentCategory: selectedCategorySlugs.length === 1 ? selectedCategorySlugs[0] : (selectedCategorySlugs.length ? selectedCategorySlugs : null),
            currentSubCategory: selectedSubCategorySlugs.length === 1 ? selectedSubCategorySlugs[0] : (selectedSubCategorySlugs.length ? selectedSubCategorySlugs : null),
            searchTerm: search,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalPackages / parseInt(limit)),
            query: req.query,
        });
    } catch (error) {
        res.status(500).send('Server Error');
    }
}

router.get('/packages', async (req, res) => {
    return renderPackagesPage(req, res);
});

router.get('/package/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        const tourPackage = await Package.findOne({ slug }).populate('category', 'name slug').populate('subCategory', 'name slug');
        if (!tourPackage) return res.status(404).render('comming-soon', { message: 'Package not found' });
        let otherPackagesQuery = { _id: { $ne: tourPackage._id }, isActive: true };
        if (tourPackage.category?._id) otherPackagesQuery.category = tourPackage.category._id;
        if (tourPackage.subCategory?._id) otherPackagesQuery.subCategory = tourPackage.subCategory._id;
        let otherPackages = await Package.find(otherPackagesQuery).limit(3).populate('category', 'name slug').populate('subCategory', 'name slug').lean();
        if (otherPackages.length < 3) {
            const remaining = 3 - otherPackages.length;
            const more = await Package.find({ _id: { $nin: [tourPackage._id, ...otherPackages.map(p => p._id)] }, isActive: true }).sort({ createdAt: -1 }).limit(remaining).lean();
            otherPackages = [...otherPackages, ...more];
        }
        const categoriesRaw = await Category.find({ isActive: true }).select('name slug imageUrl subCategories.name subCategories.slug subCategories.isActive').lean();
        const allPackages = await Package.find({ isActive: true }).populate('category', 'name slug imageUrl').populate('subCategory', 'name slug imageUrl').lean();
        const categories = categoriesRaw.map(cat => {
            const categoryPackages = allPackages.filter(pkg => pkg.category?._id.toString() === cat._id.toString());
            return {
                ...cat,
                subCategories: cat.subCategories.filter(s => s.isActive),
                packages: categoryPackages,
                directPackages: categoryPackages.filter(p => !p.subCategory),
                locationCount: categoryPackages.length
            };
        });
        res.render('packageDetails', { title: tourPackage.title, tourPackage, categories, otherPackages });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.get('/package-details', async (req, res) => {
    const { category, subCategory } = req.query;
    if(category && subCategory) {
        return res.redirect(301, `/packages/${category}/${subCategory}`);
    }
    try {
         if (!category || !subCategory) {
            return res.status(400).render('comming-soon', { message: 'Category slug and subcategory slug are required' });
        }
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

router.get('/customTours', async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true }).select('name slug imageUrl subCategories.name subCategories.slug subCategories.isActive').lean();
        const packages = await Package.find({ isActive: true }).populate({ path: 'category', select: 'name imageUrl' }).populate({ path: 'subCategory', select: 'name imageUrl', match: { isActive: true } }).lean();
        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg => pkg.category?._id.toString() === category._id.toString());
            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);
            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages,
                locationCount: categoryPackages.length
            };
        });
        res.render('customTours', { title: 'customTours', categories: categoryMap });
    } catch (error) {
        res.status(500).send('Error loading customTours page data');
    }
});

router.get('/thankyou', (req, res) => {
    res.render('thankyou', { title: 'Thank You' });
});

module.exports = router;