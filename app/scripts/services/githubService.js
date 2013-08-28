'use strict';

angular
    .module('github', [])
    .value('githubAuth', {
      client_id: localStorage.getItem('github.client_id'),
      client_secret: localStorage.getItem('github.client_secret')
    })
    .service('github', Github);

function Github(githubAuth, $http) {
  var url = 'https://api.github.com/repos/angular/angular.js';
  var self = this;

  this.getTags = function() {
    return $http.
        get(url + '/tags', {
          params: githubAuth
        }).
        then(function(response) {
          return response.data;
        });
  };

  this.getLatestTagStartingWith = function(startingWith) {
    return this.getTags().then(function(tags) {
      for (var i = 0, ii = tags.length; i < ii; i++) {
        var tag = tags[i];
        if (tag.name.indexOf(startingWith) == 0) {
          return tag.name;
        }
      }
      return null;
    });
  };

  this.getSHAsSince = function(branchName, sinceTag) {
    return $http.
        get(url + '/compare/' + sinceTag + '...' + branchName, {
          params: githubAuth
        }).
        then(function(response) {
          return response.data.ahead_by;
        });
  };

  this.getSHAsSinceSinceRelease = function(branchName) {
    var startingWithTag = (branchName == 'master')
        ? 'v1.2'
        : branchName.replace(/\.x$/, '');
    return this.
        getLatestTagStartingWith(startingWithTag).
        then(function(latestTag) {
          return self.getSHAsSince(branchName, latestTag);
        });
  }


  this.getUntriagedCounts = function() {
    var counts = {issues: 0, prs: 0};
    var nextPageUrlRegExp = /<([^>]+)>; rel="next"/;

    var handleResponse = function (response) {
      response.data.forEach(function(item) {
        if (item.pull_request.diff_url === null) {
          counts.issues++;
        } else {
          counts.prs++;
        }
      });

      var nextPageUrl = nextPageUrlRegExp.test(response.headers('Link')) &&
                          nextPageUrlRegExp.exec(response.headers('Link'))[1];

      if (nextPageUrl) {
        return $http.get(nextPageUrl).then(handleResponse);
      }

      return counts;
    };

    return $http.get(url + '/issues?state=open&milestone=none', {params: githubAuth}).then(handleResponse);
  };


  this.getAllOpenIssues = function() {
    var counts = {issues: 0, prs: 0};
    var nextPageUrlRegExp = /<([^>]+)>; rel="next"/;

    var handleResponse = function (response) {
      response.data.forEach(function(item) {
        if (item.pull_request.diff_url === null) {
          counts.issues++;
        } else {
          counts.prs++;
        }
      });

      var nextPageUrl = nextPageUrlRegExp.test(response.headers('Link')) &&
                          nextPageUrlRegExp.exec(response.headers('Link'))[1];

      if (nextPageUrl) {
        return $http.get(nextPageUrl).then(handleResponse);
      }

      return counts;
    };

    return $http.get(url + '/issues?state=open', {params: githubAuth}).then(handleResponse);
  };


  this.getCountsForMilestone = function (title) {
    var needClosed = true;
    var milestoneNumber;
    var counts = { closedPrs: 0, openPrs: 0, openIssues: 0, closedIssues: 0 };
    var nextPageUrlRegExp = /<([^>]+)>; rel="next"/;

    var handleResponse = function (response) {
      response.data.forEach(function(item) {
        if (item.state === 'closed') {
          counts[item.pull_request.diff_url ? 'closedPrs' : 'closedIssues']++;
        }
        else {
          counts[item.pull_request.diff_url ? 'openPrs' : 'openIssues']++;
        }
      });

      var nextPageUrl = nextPageUrlRegExp.test(response.headers('Link')) &&
                          nextPageUrlRegExp.exec(response.headers('Link'))[1];

      if (nextPageUrl) {
        return $http.get(nextPageUrl).then(handleResponse);
      }

      if (needClosed) {
        needClosed = false;
        return $http.get(url + '/issues?state=closed&milestone=' + milestoneNumber, {params: githubAuth}).then(handleResponse);
      }

      return counts;
    };


    var handleMilestones = function (response) {
      response.data.forEach(function (milestone) {
        if (milestone.title === title) {
          milestoneNumber = milestone.number;
        }
      });

      return $http.get(url + '/issues?state=open&milestone=' + milestoneNumber, {params: githubAuth}).then(handleResponse);
    };

    return $http.get(url + '/milestones', {params: githubAuth}).then(handleMilestones);
  }
}

