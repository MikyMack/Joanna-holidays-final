const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Package = require('../models/Package');
const Gallery = require('../models/Gallery');
const Banner = require('../models/Banner');
const Blog = require('../models/Blog');
const Testimonial = require('../models/Testimonial');
const Video = require('../models/Video');
const MainBanner = require('../models/MainBanner');

router.get('/', async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true }).sort({ createdAt: -1 });

        const mainbanners = await MainBanner.find({ isActive: true }).sort({ createdAt: -1 });

        const categories = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();

        // Fixed Departure category id
        const fixedDepartureCategoryId = '6848056f80e92de2c956def0';

        // Get all active packages
        const packages = await Package.find({ isActive: true })
            .populate({
                path: 'category',
                select: 'name imageUrl'
            })
            .populate({
                path: 'subCategory',
                select: 'name imageUrl',
                match: { isActive: true }
            })
            .lean();

        // Separate Fixed Departure packages
        const fixedDeparturePackages = packages.filter(pkg =>
            pkg.category && pkg.category._id && pkg.category._id.toString() === fixedDepartureCategoryId
        );

        // All other packages (excluding Fixed Departure)
        const otherPackages = packages.filter(pkg =>
            !(pkg.category && pkg.category._id && pkg.category._id.toString() === fixedDepartureCategoryId)
        );

        const blogs = await Blog.find().sort({ createdAt: -1 }).limit(3);

        const testimonials = await Testimonial.find().sort({ createdAt: -1 }).limit(10);

        const videos = await Video.find().sort({ createdAt: -1 }).limit(3);

        // For each category, include all packages (including Fixed Departure)
        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg =>
                pkg.category?._id.toString() === category._id.toString()
            );

            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);

            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages: directPackages,
                locationCount: categoryPackages.length 
            };
        });

        // processedPackages should include all packages (not just otherPackages)
        const processedPackages = packages.map(pkg => ({
            ...pkg,
            categoryName: pkg.category?.name || 'Deleted Category',
            categoryImage: pkg.category?.imageUrl || '',
            subCategoryName: pkg.subCategory?.name || null,
            subCategoryImage: pkg.subCategory?.imageUrl || null,
            shortDescription: pkg.packageDescription
                ? pkg.packageDescription.split(' ').slice(0, 20).join(' ') +
                (pkg.packageDescription.split(' ').length > 20 ? '...' : '')
                : ''
        }));

        const processedFixedDeparturePackages = fixedDeparturePackages.map(pkg => ({
            ...pkg,
            categoryName: pkg.category?.name || 'Deleted Category',
            categoryImage: pkg.category?.imageUrl || '',
            subCategoryName: pkg.subCategory?.name || null,
            subCategoryImage: pkg.subCategory?.imageUrl || null,
            shortDescription: pkg.packageDescription
                ? pkg.packageDescription.split(' ').slice(0, 20).join(' ') +
                (pkg.packageDescription.split(' ').length > 20 ? '...' : '')
                : ''
        }));

        res.render('index', {
            title: 'Home Page',
            banners: banners,
            mainbanners: mainbanners,
            categories: categoryMap,
            packages: processedPackages,
            fixedDeparturePackages: processedFixedDeparturePackages,
            featuredPackages: processedPackages.slice(0, 3),
            blogs: blogs,
            testimonials: testimonials,
            videos: videos,
            discount: Math.random() > 0.9 ? Math.floor(Math.random() * 15) + 10 : 0,
            query: req.query
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading home page data');
    }
});

router.get('/about', async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();

        const blogs = await Blog.find().sort({ createdAt: -1 }).limit(3);
        const mainbanners = await MainBanner.find({ isActive: true }).sort({ createdAt: -1 });
        const gallery = await Gallery.find().sort({ createdAt: -1 }).limit(20);
        const testimonials = await Testimonial.find().sort({ createdAt: -1 }).limit(10);
        const packages = await Package.find({ isActive: true })
            .populate({
                path: 'category',
                select: 'name imageUrl'
            })
            .populate({
                path: 'subCategory',
                select: 'name imageUrl',
                match: { isActive: true }
            })
            .lean();
        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg =>
                pkg.category?._id.toString() === category._id.toString()
            );

            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);

            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages: directPackages, // ✅ for dropdown logic
                locationCount: categoryPackages.length // ✅ keep this if you use it
            };
        });
        res.render('about', {
            title: 'About Us',
            categories: categoryMap,
            blogs: blogs,
            gallery: gallery,
            testimonials,
            mainbanners
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading about us page data');
    }
});
router.get('/blogs', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        // Fetch blogs with pagination
        const blogs = await Blog.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // Fetch categories
        const categories = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();
        const packages = await Package.find({ isActive: true })
            .populate({
                path: 'category',
                select: 'name imageUrl'
            })
            .populate({
                path: 'subCategory',
                select: 'name imageUrl',
                match: { isActive: true }
            })
            .lean();
        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg =>
                pkg.category?._id.toString() === category._id.toString()
            );

            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);

            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages: directPackages, // ✅ for dropdown logic
                locationCount: categoryPackages.length // ✅ keep this if you use it
            };
        });
        // Get total number of blogs for pagination
        const totalBlogs = await Blog.countDocuments();

        res.render('blogs', {
            title: 'Blogs',
            blogs: blogs,
            categories: categoryMap,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalBlogs / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading blogs page data');
    }
});
router.get('/gallery', async (req, res) => {
    try {
        // Pagination for gallery and videos
        const { page = 1 } = req.query;
        const galleryLimit = 10;
        const videoLimit = 9;
        const galleryPage = parseInt(page) || 1;
        const videoPage = parseInt(req.query.videoPage) || 1;

        // Fetch categories
        const categories = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();

        // Fetch packages
        const packages = await Package.find({ isActive: true })
            .populate({
                path: 'category',
                select: 'name imageUrl'
            })
            .populate({
                path: 'subCategory',
                select: 'name imageUrl',
                match: { isActive: true }
            })
            .lean();

        // Map categories
        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg =>
                pkg.category?._id.toString() === category._id.toString()
            );
            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);

            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages: directPackages,
                locationCount: categoryPackages.length
            };
        });

        // Gallery pagination
        const totalGalleryItems = await Gallery.countDocuments();
        const gallery = await Gallery.find()
            .skip((galleryPage - 1) * galleryLimit)
            .limit(galleryLimit);

        // Videos pagination
        const totalVideos = await Video.countDocuments();
        const videos = await Video.find()
            .sort({ createdAt: -1 })
            .skip((videoPage - 1) * videoLimit)
            .limit(videoLimit);

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
        console.error(error);
        res.status(500).send('Error loading gallery page data');
    }
});


router.get('/contact', async (req, res) => {
    try {
        // Fetch categories
        const categories = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();

        // Fetch packages
        const packages = await Package.find({ isActive: true })
            .populate({
                path: 'category',
                select: 'name imageUrl'
            })
            .populate({
                path: 'subCategory',
                select: 'name imageUrl',
                match: { isActive: true }
            })
            .lean();

        // Process category map
        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg =>
                pkg.category?._id.toString() === category._id.toString()
            );

            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);

            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages: directPackages,
                locationCount: categoryPackages.length
            };
        });

        // Render contact page with categories
        res.render('contact', {
            title: 'Contact Us',
            categories: categoryMap
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading contact page data');
    }
});
router.get('/packages', async (req, res) => {
    try {
        const {
            category,
            subCategory,
            search,
            minPrice,
            maxPrice,
            duration,
            tourType,
            page = 1,
            limit = 10
        } = req.query;

        const skip = (page - 1) * limit;
        const matchQuery = { isActive: true };

        // --- Category filtering by name ---
        let categoryIds = null;
        let subCategoryFilters = null;
        let selectedCategoryNames = [];
        let selectedSubCategoryNames = [];

        // Handle category filtering by name
        if (category) {
            // Handles single or multiple category names (comma separated or array)
            const categoryNames = Array.isArray(category)
                ? category
                : category.split(',').map(name => name.trim());

            // Find categories by name
            const categoryDocs = await Category.find({ name: { $in: categoryNames } }).select('_id name subCategories');
            categoryIds = categoryDocs.map(cat => cat._id);
            matchQuery.category = { $in: categoryIds };
            selectedCategoryNames = categoryDocs.map(cat => cat.name);
            subCategoryFilters = categoryDocs.map(cat => cat.subCategories || []).flat();
        }

        // Handle subcategory filtering by name
        if (subCategory) {
            // Handles single or multiple subcategory names (comma separated or array)
            const subCategoryNames = Array.isArray(subCategory)
                ? subCategory
                : subCategory.split(',').map(name => name.trim());

            // Find matching subcategory _ids under those categories (or all categories if none specified)
            let matchedSubcategories = [];
            if (subCategoryFilters) {
                // Filter only within subCategoryFilters (from the filtered categories)
                for (const subcatName of subCategoryNames) {
                    const found = subCategoryFilters.find(sc => sc.name === subcatName);
                    if (found) matchedSubcategories.push(found._id);
                }
            } else {
                // Search all categories for any subcategory with that name
                const categoryDocs = await Category.find({ "subCategories.name": { $in: subCategoryNames } });
                for (const cat of categoryDocs) {
                    for (const sc of cat.subCategories) {
                        if (subCategoryNames.includes(sc.name)) matchedSubcategories.push(sc._id);
                    }
                }
            }
            if (matchedSubcategories.length > 0) {
                matchQuery.subCategory = { $in: matchedSubcategories };
            } else {
                // If no matched subcategories, ensure search yields nothing
                matchQuery.subCategory = { $in: [] };
            }
            selectedSubCategoryNames = subCategoryNames;
        }

        if (duration) matchQuery.duration = duration;
        if (tourType) matchQuery.tourType = tourType;

        if (minPrice || maxPrice) {
            matchQuery.packagePrice = {};
            if (minPrice) matchQuery.packagePrice.$gte = Number(minPrice);
            if (maxPrice) matchQuery.packagePrice.$lte = Number(maxPrice);
        }

        const searchRegex = search && search.length >= 3 ? new RegExp(search, 'i') : null;

        // Main aggregation pipeline
        const aggregationPipeline = [
            { $match: matchQuery },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $addFields: {
                    subCategoryObj: {
                        $filter: {
                            input: '$category.subCategories',
                            as: 'subCat',
                            cond: { $eq: ['$$subCat._id', '$subCategory'] }
                        }
                    }
                }
            },
            {
                $addFields: {
                    subCategory: { $arrayElemAt: ['$subCategoryObj', 0] }
                }
            }
        ];

        // Add search if applicable (search by name, not _id!)
        if (searchRegex) {
            aggregationPipeline.push({
                $match: {
                    $or: [
                        { title: { $regex: searchRegex } },
                        { destination: { $regex: searchRegex } },
                        { packageDescription: { $regex: searchRegex } },
                        { 'category.name': { $regex: searchRegex } },
                        { 'subCategory.name': { $regex: searchRegex } }
                    ]
                }
            });
        }

        // Get total count and paginated results
        const [packageResults, totalResult, categories] = await Promise.all([
            Package.aggregate([...aggregationPipeline, { $skip: skip }, { $limit: parseInt(limit) }]),
            Package.aggregate([...aggregationPipeline, { $count: 'total' }]),
            Category.find({ isActive: true }).select('name imageUrl subCategories').lean().sort({ createdAt: -1 })
        ]);

        const totalPackages = totalResult.length > 0 ? totalResult[0].total : 0;

        // Prepare response (pass currentCategory and currentSubCategory as names)
        const responseData = {
            title: 'Tour Packages',
            packages: packageResults,
            categories: categories.map(cat => ({
                ...cat,
                subCategories: cat.subCategories.filter(sub => sub.isActive),
                packageCount: packageResults.filter(p => (p.category.name === cat.name)).length
            })),
            currentCategory: selectedCategoryNames.length === 1 ? selectedCategoryNames[0] : selectedCategoryNames,
            currentSubCategory: selectedSubCategoryNames.length === 1 ? selectedSubCategoryNames[0] : selectedSubCategoryNames,
            searchTerm: search,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalPackages / limit),
            query: req.query
        };

        res.render('packages', responseData);
    } catch (error) {
        console.error('Error in /packages route:', error);
        res.status(500).send('Server Error');
    }
});
  

// Package details page
router.get('/package/:title', async (req, res) => {
    try {
        const rawTitle = req.params.title;
        let tourPackage = await Package.findOne({ title: decodeURIComponent(rawTitle) })
            .populate('category', 'name')
            .populate('subCategory', 'name');

        if (!tourPackage) {
            const slugTitle = decodeURIComponent(rawTitle).replace(/-/g, ' ');
            tourPackage = await Package.findOne({ title: new RegExp('^' + slugTitle + '$', 'i') })
                .populate('category', 'name')
                .populate('subCategory', 'name');
        }

        if (!tourPackage) {
            return res.status(404).render('comming-soon', {
                message: 'Package not found'
            });
        }

        let otherPackagesQuery = {
            _id: { $ne: tourPackage._id },
            isActive: true
        };
        if (tourPackage.category && tourPackage.category._id) {
            otherPackagesQuery.category = tourPackage.category._id;
        }
        if (tourPackage.subCategory && tourPackage.subCategory._id) {
            otherPackagesQuery.subCategory = tourPackage.subCategory._id;
        }

        let otherPackages = await Package.find(otherPackagesQuery)
            .limit(3)
            .populate('category', 'name')
            .populate('subCategory', 'name')
            .lean();

        if (otherPackages.length < 3) {
            const fillCount = 3 - otherPackages.length;
            const additionalPackages = await Package.find({
                _id: { $nin: [tourPackage._id, ...otherPackages.map(pkg => pkg._id)] },
                isActive: true,
            })
            .sort({ createdAt: -1 })
            .limit(fillCount)
            .populate('category', 'name')
            .populate('subCategory', 'name')
            .lean();
            otherPackages = otherPackages.concat(additionalPackages);
        }

        const categoriesRaw = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();

        const allPackages = await Package.find({ isActive: true })
            .populate({
                path: 'category',
                select: 'name imageUrl'
            })
            .populate({
                path: 'subCategory',
                select: 'name imageUrl',
                match: { isActive: true }
            })
            .lean();

        const categories = categoriesRaw.map(cat => {
            const categoryPackages = allPackages.filter(pkg =>
                pkg.category?._id.toString() === cat._id.toString()
            );

            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);

            return {
                ...cat,
                subCategories: cat.subCategories.filter(sub => sub.isActive),
                directPackages,
                packages: categoryPackages,
                locationCount: categoryPackages.length
            };
        });

        res.render('packageDetails', {
            title: tourPackage.title,
            tourPackage,
            categories, 
            otherPackages
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

router.get('/package-details', async (req, res) => {
    try {
        const { category: categoryName, subCategory: subCategoryName } = req.query;

        if (!categoryName || !subCategoryName) {
            return res.status(400).render('comming-soon', {
                message: 'Category name and subcategory name are required'
            });
        }

        const category = await Category.findOne(
            { 
                name: categoryName,
                isActive: true,
                'subCategories': { 
                  $elemMatch: { 
                    name: subCategoryName, 
                    isActive: true 
                  } 
                }
            },
            { name: 1, imageUrl: 1, subCategories: 1 }
        ).lean();

        if (!category) {
            return res.status(404).render('comming-soon', {
                message: 'Category or subcategory not found'
            });
        }

        // Find the subcategory object by name
        const subCategoryData = category.subCategories.find(
            (sub) => sub.name.toLowerCase() === subCategoryName.toLowerCase() && sub.isActive
        );

        if (!subCategoryData) {
            return res.status(404).render('comming-soon', {
                message: 'Subcategory not found'
            });
        }

        // Find first matching package with both category and subcategory name (isActive only)
        const tourPackage = await Package.findOne({
            category: category._id,
            subCategory: subCategoryData._id,
            isActive: true
        })
            .populate('category', 'name')
            .populate('subCategory', 'name');

        if (!tourPackage) {
            return res.status(404).render('comming-soon', {
                message: 'No packages found in this subcategory'
            });
        }

        // Find other packages from this subcategory, but exclude the current one (max 3)
        let otherPackages = await Package.find({
            category: category._id,
            subCategory: subCategoryData._id,
            isActive: true,
            _id: { $ne: tourPackage._id }
        })
            .limit(3)
            .populate('category', 'name')
            .populate('subCategory', 'name')
            .lean();

        // If not enough, fill up to 3 from other active packages (exclude current & already included)
        if (otherPackages.length < 3) {
            const fillCount = 3 - otherPackages.length;
            const additionalPackages = await Package.find({
                _id: { $nin: [tourPackage._id, ...otherPackages.map(pkg => pkg._id)] },
                isActive: true,
            })
            .sort({ createdAt: -1 })
            .limit(fillCount)
            .populate('category', 'name')
            .populate('subCategory', 'name')
            .lean();

            otherPackages = otherPackages.concat(additionalPackages);
        }

        // Build categories for navigation (same as in other routes)
        const categoriesRaw = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();

        const allPackages = await Package.find({ isActive: true })
            .populate({
                path: 'category',
                select: 'name imageUrl'
            })
            .populate({
                path: 'subCategory',
                select: 'name imageUrl',
                match: { isActive: true }
            })
            .lean();

        const categories = categoriesRaw.map(cat => {
            const categoryPackages = allPackages.filter(pkg =>
                pkg.category?._id.toString() === cat._id.toString()
            );

            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);

            return {
                ...cat,
                subCategories: cat.subCategories.filter(sub => sub.isActive),
                directPackages,
                packages: categoryPackages,
                locationCount: categoryPackages.length
            };
        });

        res.render('packageDetails', {
            title: tourPackage.title || subCategoryData.name,
            tourPackage: tourPackage,
            subCategory: subCategoryData,
            parentCategory: {
                _id: category._id,
                name: category.name
            },
            categories,
            otherPackages
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});
router.get('/blogdetails', async (req, res) => {
    try {
        const { title } = req.query;

        if (!title) {
            return res.status(400).send('Blog title is required');
        }

        // Search blog by exact title match
        const blog = await Blog.findOne({ title }).lean();

        if (!blog) {
            return res.status(404).send('Blog not found');
        }

        const categories = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();

        const relatedBlogs = await Blog.find({ title: { $ne: title } })
            .sort({ createdAt: -1 })
            .limit(3)
            .lean();

        res.render('blogdetails', {
            title: blog.title || 'Blog Details',
            blog: blog,
            relatedBlogs: relatedBlogs,
            categories
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading blog details page data');
    }
});

router.get('/customTours', async (req, res) => {
    try {
        // Fetch categories
        const categories = await Category.find({ isActive: true })
            .select('name imageUrl subCategories').sort({ createdAt: -1 })
            .lean();

        // Fetch packages
        const packages = await Package.find({ isActive: true })
            .populate({
                path: 'category',
                select: 'name imageUrl'
            })
            .populate({
                path: 'subCategory',
                select: 'name imageUrl',
                match: { isActive: true }
            })
            .lean();

        // Process category map
        const categoryMap = categories.map(category => {
            const categoryPackages = packages.filter(pkg =>
                pkg.category?._id.toString() === category._id.toString()
            );

            const directPackages = categoryPackages.filter(pkg => !pkg.subCategory);

            return {
                ...category,
                subCategories: category.subCategories.filter(sub => sub.isActive),
                packages: categoryPackages,
                directPackages: directPackages,
                locationCount: categoryPackages.length
            };
        });

        // Render contact page with categories
        res.render('customTours', {
            title: 'customTours',
            categories: categoryMap
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading customTours page data');
    }
});





module.exports = router;