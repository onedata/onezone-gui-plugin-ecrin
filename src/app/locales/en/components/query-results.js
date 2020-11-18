const noProvenanceTip = 'No information about the provenance of data.';

export default {
  tooMuchResultsAlert: 'The latest search resulted in {{totalCount}} studies. Only the first 1000 of them were presented. Please refine your search parameters.',
  resultsLimitReachedAlert: 'You have reached the maximum number of studies in the results list. Please refine your search parameters.',
  resultsCounter: 'Results: {{filteredCount}} ({{totalCount}} without filtering)',
  load: 'Load...',
  save: 'Save...',
  exportToPdf: 'Export to pdf',
  exportingToPdf: 'Exporting to pdf...',
  clear: 'Clear results',
  studyRecord: {
    noProvenanceTip,
    studyDescription: 'Description',
    studyDetails: 'Details',
    studyFeatures: 'Features',
    studyDataSharingStatement: 'Data sharing statement',
    studyIdentifiers: 'Identifiers',
    studyTopics: 'Associated topics',
    studyRelatedStudies: 'Related studies',
    addRelatedToResults: 'add to results',
    relatedAlreadyInResults: 'already in results',
    accessDetails: 'Access details',
    accessDetailsSeeMore: 'see',
    urlAccess: 'Access',
    urlType: {
      journalAbstract: 'Abstract',
      journalArticle: 'Article',
    },
    publisher: 'Publisher / provider',
    untitled: 'Untitled',
    loading: 'Loading...',
  },
  dataObjectRecord: {
    noProvenanceTip,
    showLess: '(show less)',
    showMore: '(show more)',
  },
};
