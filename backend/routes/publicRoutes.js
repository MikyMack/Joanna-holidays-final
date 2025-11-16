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
            month,
            page = 1,
            limit = 10,
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build Mongoose query object
        const queryObj = { isActive: true };

        // Get all categories to filter/search by name and for side nav display
        const allCategories = await Category.find({ isActive: true })
            .select('name imageUrl subCategories')
            .lean()
            .sort({ createdAt: -1 });

        // Handle category name(s) filter
        let selectedCategoryNames = [];
        if (category) {
            const categoryNamesArr = Array.isArray(category)
                ? category
                : String(category).split(',').map(n => n.trim()).filter(Boolean);
            if (categoryNamesArr.length) {
                const matchedCategoryDocs = allCategories.filter(cat => categoryNamesArr.includes(cat.name));
                const catIds = matchedCategoryDocs.map(cat => String(cat._id));
                if (catIds.length) {
                    queryObj.category = { $in: catIds };
                    selectedCategoryNames = matchedCategoryDocs.map(cat => cat.name);
                }
            }
        }

        // Handle subCategory name(s) filter (resolve subcategory _ids first)
        let selectedSubCategoryNames = [];
        if (subCategory) {
            const subCatNamesArr = Array.isArray(subCategory)
                ? subCategory
                : String(subCategory).split(',').map(n => n.trim()).filter(Boolean);

            let allSubCats = [];
            if (queryObj.category && Array.isArray(queryObj.category.$in)) {
                // from selected categories only
                const filteredCats = allCategories.filter(cat => queryObj.category.$in.includes(String(cat._id)));
                filteredCats.forEach(cat => {
                    (cat.subCategories || []).forEach(sub => {
                        allSubCats.push(sub);
                    });
                });
            } else {
                // from all categories
                allCategories.forEach(cat => {
                    (cat.subCategories || []).forEach(sub => {
                        allSubCats.push(sub);
                    });
                });
            }

            const matchedSubCatIds = [];
            subCatNamesArr.forEach(name => {
                const found = allSubCats.find(sc => sc.name === name && sc.isActive !== false);
                if (found) matchedSubCatIds.push(found._id);
            });

            if (matchedSubCatIds.length) {
                queryObj.subCategory = { $in: matchedSubCatIds };
                selectedSubCategoryNames = subCatNamesArr;
            } else {
                // If searching for a subcategory but no valid ones, set impossible filter
                if (subCatNamesArr.length) {
                    queryObj.subCategory = { $in: [] };
                }
            }
        }

        // Duration/tourType/month (opt: month currently just string match on a field, if you want)
        if (duration) queryObj.duration = duration;
        if (tourType) queryObj.tourType = tourType;
        if (month) queryObj.month = month; // Only if you have such field

        // Price range
        if (minPrice || maxPrice) {
            queryObj.packagePrice = {};
            if (minPrice) queryObj.packagePrice.$gte = +minPrice;
            if (maxPrice) queryObj.packagePrice.$lte = +maxPrice;
        }

        // Search in key text fields
        let searchRegex = null;
        if (search && String(search).length >= 3) {
            searchRegex = new RegExp(search, 'i');
        }
        let searchFilter = {};
        if (searchRegex) {
            searchFilter = {
                $or: [
                    { title: { $regex: searchRegex } },
                    { destination: { $regex: searchRegex } },
                    { packageDescription: { $regex: searchRegex } },
                ]
            };
        }

        // Combine main and search filter
        const finalQuery = Object.keys(searchFilter).length
            ? { $and: [queryObj, searchFilter] }
            : queryObj;

        // Main Package query (populate category/subCategory for UI)
        const [totalPackages, packages, categoriesForList] = await Promise.all([
            Package.countDocuments(finalQuery),
            Package.find(finalQuery)
                .populate({ path: 'category', select: 'name imageUrl' })
                .populate({ path: 'subCategory', select: 'name imageUrl' })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            // For filter/category sidebar/buttons
            Category.find({ isActive: true })
                .select('name imageUrl subCategories')
                .lean()
                .sort({ createdAt: -1 })
        ]);

        // Filter category list for only active subCategories
        const uiCategories = categoriesForList.map(cat => ({
            ...cat,
            subCategories: (cat.subCategories || []).filter(sub => sub.isActive)
        }));

        // For category tab counts (just based on current page of packages, not total in db)
        const pageCats = {};
        packages.forEach(pkg => {
            if (pkg.category && pkg.category.name) {
                pageCats[pkg.category.name] = pageCats[pkg.category.name] ? pageCats[pkg.category.name] + 1 : 1;
            }
        });

        // Send to EJS renderer
        res.render('packages', {
            title: 'Tour Packages',
            packages,
            categories: uiCategories.map(cat => ({
                ...cat,
                packageCount: pageCats[cat.name] || 0,
            })),
            currentCategory:
                selectedCategoryNames.length === 1
                    ? selectedCategoryNames[0]
                    : (selectedCategoryNames.length ? selectedCategoryNames : null),
            currentSubCategory:
                selectedSubCategoryNames.length === 1
                    ? selectedSubCategoryNames[0]
                    : (selectedSubCategoryNames.length ? selectedSubCategoryNames : null),
            searchTerm: search,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalPackages / parseInt(limit)),
            query: req.query,
        });

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

router.get('/thankyou', (req, res) => {
    res.render('thankyou', {
        title: 'Thank You'
    });
});




module.exports = router;