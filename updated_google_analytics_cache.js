// Updated Aug 28, 2019
// In Google Analytics you'll need to set up custom dimensions as follows
// Custom Dimension 1 = Canvas User ID --- Scope = User
// Custom Dimension 2 = Archived --- Scope = User
// Custom Dimension 3 = Canvas User Role --- Scope = User
// Custom Dimension 4 = Canvas Course ID --- Scope = Hit
// Custom Dimension 5 = Canvas Course Name --- Scope = Hit
// Custom Dimension 6 = Canvas Sub-Account ID --- Scope = Hit
// Custom Dimension 7 = Canvas Term ID --- = Scope = Hit
// Custom Dimension 8 = Canvas Course Role --- Scope = Hit

function removeStorage(key) {
    try {
        localStorage.removeItem(key);
        localStorage.removeItem(key + '_expiresIn');
    } catch (e) {
        console.log('removeStorage: Error removing key [' + key + '] from localStorage: ' + JSON.stringify(e));
        return false;
    }
    return true;
}

function getStorage(key) {
    var now = Date.now(); //epoch time, lets deal only with integer
    // set expiration for storage
    var expiresIn = localStorage.getItem(key + '_expiresIn');
    if (expiresIn === undefined || expiresIn === null) {
        expiresIn = 0;
    }

    if (expiresIn < now) { // Expired
        removeStorage(key);
        return null;
    } else {
        try {
            var value = localStorage.getItem(key);
            return value;
        } catch (e) {
            console.log('getStorage: Error reading key [' + key + '] from localStorage: ' + JSON.stringify(e));
            return null;
        }
    }
}

function setStorage(key, value, expires) {
    if (expires === undefined || expires === null) {
        expires = (24 * 60 * 60); // default: seconds for 6 hours (6*60*60)
    } else {
        expires = Math.abs(expires); //make sure it's positive
    }

    var now = Date.now(); //millisecs since epoch time, lets deal only with integer
    var schedule = now + expires * 1000;
    try {
        localStorage.setItem(key, value);
        localStorage.setItem(key + '_expiresIn', schedule);
    } catch (e) {
        console.log('setStorage: Error setting key [' + key + '] in localStorage: ' + JSON.stringify(e));
        return false;
    }
    return true;
}

// For Google Analytics
async function coursesRequest(courseId) {
    let response = await fetch('/api/v1/users/self/courses?per_page=100', {headers: {Accept: 'application/json'}});
    let data = await response.json();
  
    var stringData = JSON.stringify(data)
    setStorage('ga_enrollments', stringData, null)
    var course = parseCourses(courseId, stringData)
    return course
};

// For Google Analytics
function parseCourses(courseId, courseData) {
    if (courseData != undefined) {
        let data = JSON.parse(courseData);
        for (var i = 0; i < data.length; i++) {
            if (data[i]['id'] == courseId) {
                return data[i]
            }
        }
    }
    return null
}

// For Google Analytics
function gaCourseDimensions(course) {
    ga('custom_ga.set', 'dimension1', course['id']);
    ga('custom_ga.set', 'dimension2', course['name']);
    ga('custom_ga.set', 'dimension4', course['account_id']);
    ga('custom_ga.set', 'dimension7', course['enrollment_term_id']);
    ga('custom_ga.set', 'dimension8', course['enrollments'][0]['type']);
    ga('custom_ga.send', 'pageview');
    return
}
// For Google Analytics
function googleAnalyticsCode(trackingID) {
    var userId, userRoles, attempts, courseId;
    ga('create', trackingID, 'auto', 'custom_ga');
    userId = ENV["current_user_id"];
    userRoles = ENV['current_user_roles'];
    ga('custom_ga.set', 'userId', userId);
    ga('custom_ga.set', 'dimension5', userId);
    ga('custom_ga.set', 'dimension3', userRoles);
    courseId = window.location.pathname.match(/\/courses\/(\d+)/);
    if (courseId) {
        courseId = courseId[1];
        attempts = 0;
        try {
            let courses = getStorage('ga_enrollments')
            if (courses != null) {
                var course = parseCourses(courseId, courses);
                if (course === null) {
                    coursesRequest(courseId).then(course => {
                        if (course === null) {
                            ga('custom_ga.set', 'dimension4', courseId);
                            ga('custom_ga.send', 'pageview');
                        } else {
                            gaCourseDimensions(course)
                        }
                    });
                } else {
                    gaCourseDimensions(course)
                }
            } else {
                coursesRequest(courseId).then(course => {
                    if (course === null) {
                        ga('custom_ga.set', 'dimension4', courseId);
                        ga('custom_ga.send', 'pageview');
                    } else {
                        gaCourseDimensions(course)
                    }
                });
            }
        } catch (err) {
            attempts += 1;
            if (attempts > 5) {
                ga('custom_ga.set', 'dimension4', courseId);
                ga('custom_ga.send', 'pageview');
                return;
            };
        };
    } else {
        ga('custom_ga.send', 'pageview');
    };
};
// END - Google Analytics Tracking Code

googleAnalyticsCode("UA-12345678-1") // replace google analytics tracking id here
